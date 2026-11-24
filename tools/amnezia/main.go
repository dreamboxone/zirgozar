// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
package main

import (
	"bytes"
	"compress/zlib"
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/ecdh"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/sha512"
	"crypto/x509"
	_ "embed"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"encoding/pem"
	"errors"
	"flag"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"syscall"
	"time"
)

//go:embed gateway-public.pem
var gatewayKey []byte

const maxDocument = 2 << 20
const legacyError = "This Amnezia API key is obsolete. Create a new connection in AmneziaVPN, or use amnezia://free?country=ir."

type object = map[string]any

func str(v any) string                 { s, _ := v.(string); return s }
func obj(v any) object                 { m, _ := v.(map[string]any); return m }
func text(m object, key string) string { return str(m[key]) }

func decode64(s string) ([]byte, error) {
	s = strings.TrimRight(strings.TrimSpace(s), "=")
	s = strings.NewReplacer("+", "-", "/", "_").Replace(s)
	return base64.RawURLEncoding.Strict().DecodeString(s)
}

func readBounded(r io.Reader) ([]byte, error) {
	b, e := io.ReadAll(io.LimitReader(r, maxDocument+1))
	if len(b) > maxDocument {
		return nil, errors.New("Amnezia configuration is too large.")
	}
	return b, e
}

func decodeLink(link string) (object, error) {
	if strings.HasPrefix(link, "amnezia://free?") {
		u, e := url.Parse(link)
		if e != nil {
			return nil, errors.New("Invalid Amnezia link.")
		}
		country := strings.ToLower(u.Query().Get("country"))
		if len(country) != 2 || country[0] < 'a' || country[0] > 'z' || country[1] < 'a' || country[1] > 'z' {
			return nil, errors.New("Choose a two-letter Amnezia country code.")
		}
		return object{"api_config": object{"service_type": "amnezia-free", "service_protocol": "awg", "user_country_code": country}}, nil
	}
	if !strings.HasPrefix(link, "vpn://") {
		return nil, errors.New("Invalid Amnezia link.")
	}
	s := strings.SplitN(strings.TrimPrefix(link, "vpn://"), "#", 2)[0]
	b, e := decode64(s)
	if e != nil || len(b) == 0 || len(b) > maxDocument {
		return nil, errors.New("Invalid Amnezia link.")
	}
	// Qt qCompress prefixes the zlib stream with a four-byte big-endian size.
	if len(b) > 6 && b[4] == 0x78 {
		r, err := zlib.NewReader(bytes.NewReader(b[4:]))
		if err != nil {
			return nil, errors.New("Invalid compressed Amnezia configuration.")
		}
		b, e = readBounded(r)
		r.Close()
		if e != nil {
			return nil, e
		}
	}
	var m object
	if json.Unmarshal(b, &m) != nil || m == nil {
		return nil, errors.New("Invalid Amnezia configuration.")
	}
	if text(m, "api_endpoint") != "" {
		return nil, errors.New(legacyError)
	}
	return m, nil
}

// Native exports contain last_config as JSON text, with config holding the
// WireGuard profile. Server-only exports must never become client profiles.
func profile(m object) (string, error) {
	containers, _ := m["containers"].([]any)
	for _, raw := range containers {
		c := obj(raw)
		for _, kind := range []string{"amnezia-awg", "amnezia-awg2", "awg", "amnezia-wireguard"} {
			protocol := obj(c[kind])
			if protocol == nil {
				continue
			}
			last := protocol["last_config"]
			cfg := obj(last)
			if s := str(last); s != "" {
				_ = json.Unmarshal([]byte(s), &cfg)
			}
			if cfg == nil {
				continue
			}
			if s := text(cfg, "config"); strings.Contains(s, "[Interface]") && strings.Contains(s, "[Peer]") && strings.Contains(s, "PrivateKey") && !strings.Contains(s, "$WIREGUARD_CLIENT_PRIVATE_KEY") {
				return s, nil
			}
		}
	}
	return "", errors.New("No complete AmneziaWG client profile was returned.")
}

func cbc(data, key, iv []byte, decrypt bool) ([]byte, error) {
	block, e := aes.NewCipher(key)
	if e != nil || len(iv) < aes.BlockSize {
		return nil, errors.New("Invalid Amnezia encryption parameters.")
	}
	if !decrypt {
		n := aes.BlockSize - len(data)%aes.BlockSize
		data = append(append([]byte{}, data...), bytes.Repeat([]byte{byte(n)}, n)...)
		out := make([]byte, len(data))
		cipher.NewCBCEncrypter(block, iv[:16]).CryptBlocks(out, data)
		return out, nil
	}
	if len(data) == 0 || len(data)%16 != 0 {
		return nil, errors.New("Invalid encrypted Amnezia response.")
	}
	out := make([]byte, len(data))
	cipher.NewCBCDecrypter(block, iv[:16]).CryptBlocks(out, data)
	n := int(out[len(out)-1])
	if n < 1 || n > 16 || n > len(out) {
		return nil, errors.New("Invalid Amnezia response padding.")
	}
	for _, b := range out[len(out)-n:] {
		if int(b) != n {
			return nil, errors.New("Invalid Amnezia response padding.")
		}
	}
	return out[:len(out)-n], nil
}

func newHTTP(proxy string) (*http.Client, error) {
	dial := &net.Dialer{Timeout: 5 * time.Second, Control: func(_, _ string, c syscall.RawConn) error {
		return c.Control(func(fd uintptr) { _ = syscall.SetsockoptInt(int(fd), syscall.SOL_SOCKET, syscall.SO_MARK, 255) })
	}}
	// Mark DNS sockets too: obtaining a config must work before its VPN exists.
	dial.Resolver = &net.Resolver{PreferGo: true, Dial: func(ctx context.Context, n, a string) (net.Conn, error) {
		d := &net.Dialer{Timeout: 3 * time.Second, Control: dial.Control}
		return d.DialContext(ctx, n, a)
	}}
	t := &http.Transport{DialContext: dial.DialContext, TLSHandshakeTimeout: 5 * time.Second, ResponseHeaderTimeout: 6 * time.Second}
	if proxy != "" {
		u, e := url.Parse(proxy)
		if e != nil || u.Host == "" || (u.Scheme != "http" && u.Scheme != "https" && u.Scheme != "socks5" && u.Scheme != "socks5h") {
			return nil, errors.New("Invalid Amnezia proxy URL.")
		}
		t.Proxy = http.ProxyURL(u)
	}
	return &http.Client{Transport: t, Timeout: 7 * time.Second, CheckRedirect: func(r *http.Request, via []*http.Request) error { return http.ErrUseLastResponse }}, nil
}

func request(ctx context.Context, c *http.Client, method, target string, body []byte) ([]byte, error) {
	r, e := http.NewRequestWithContext(ctx, method, target, bytes.NewReader(body))
	if e != nil {
		return nil, errors.New("Invalid Amnezia endpoint.")
	}
	r.Header.Set("Content-Type", "application/json")
	resp, e := c.Do(r)
	if e != nil {
		return nil, errors.New("Amnezia endpoint is unreachable.")
	}
	defer resp.Body.Close()
	// API errors may also have an encrypted body (including HTTP 402).
	if (method == "GET" && (resp.StatusCode < 200 || resp.StatusCode >= 300)) || (resp.StatusCode >= 300 && resp.StatusCode < 400) {
		return nil, fmt.Errorf("Amnezia endpoint rejected the request (HTTP %d).", resp.StatusCode)
	}
	return readBounded(resp.Body)
}

var storages = []string{
	"https://s3.eu-north-1.amazonaws.com/amnezia/",
	"https://storage.googleapis.com/lambda-list/",
	"https://amnzstrg01.blob.core.windows.net/lambda-list/",
	"https://objectstorage.eu-zurich-1.oraclecloud.com/n/zrhfyaq6qxvh/b/lambda-list/o/",
	"https://storage.mwsapis.ru/lambda-list/",
	"https://46.8.209.252/lambda-list/",
	"https://s3.cloudruserapi.net/lambda-list/",
}

type gateway struct {
	client   *http.Client
	key      []byte
	endpoint string
	stores   []string
}

func (g gateway) post(ctx context.Context, path string, payload object, service, country string) (object, error) {
	b, _ := pem.Decode(g.key)
	if b == nil {
		return nil, errors.New("Amnezia gateway public key is missing.")
	}
	pk, e := x509.ParsePKIXPublicKey(b.Bytes)
	if e != nil {
		return nil, errors.New("Invalid Amnezia gateway public key.")
	}
	pub, ok := pk.(*rsa.PublicKey)
	if !ok {
		return nil, errors.New("Invalid Amnezia gateway public key.")
	}
	key := make([]byte, 32)
	iv := make([]byte, 32)
	salt := make([]byte, 8)
	for _, v := range [][]byte{key, iv, salt} {
		if _, e = rand.Read(v); e != nil {
			return nil, e
		}
	}
	keys, _ := json.Marshal(object{"aes_key": base64.StdEncoding.EncodeToString(key), "aes_iv": base64.StdEncoding.EncodeToString(iv), "aes_salt": base64.StdEncoding.EncodeToString(salt)})
	sealed, e := rsa.EncryptPKCS1v15(rand.Reader, pub, keys)
	if e != nil {
		return nil, e
	}
	plain, _ := json.Marshal(payload)
	encrypted, e := cbc(plain, key, iv, false)
	if e != nil {
		return nil, e
	}
	wire, _ := json.Marshal(object{"key_payload": base64.StdEncoding.EncodeToString(sealed), "api_payload": base64.StdEncoding.EncodeToString(encrypted)})
	attempt := func(base string) (object, error) {
		data, err := request(ctx, g.client, "POST", strings.TrimRight(base, "/")+"/"+path, wire)
		if err != nil {
			return nil, err
		}
		data, err = cbc(data, key, iv, true)
		if err != nil {
			return nil, err
		}
		var result object
		if json.Unmarshal(data, &result) != nil || result == nil {
			return nil, errors.New("Invalid Amnezia API response.")
		}
		return result, nil
	}
	if result, err := attempt(g.endpoint); err == nil {
		return result, nil
	} else {
		trace("direct", err)
	}
	// Storage objects contain encrypted lists of gateway relays, not HTTP
	// CONNECT proxies. Each relay accepts the same encrypted request envelope.
	h := sha512.Sum512(g.key)
	token := base64.RawURLEncoding.EncodeToString([]byte("endpoints-"+service+"-"+country)) + ".json"
	seen := map[string]bool{}
	for _, storage := range g.stores {
		for _, name := range []string{token, "endpoints.json"} {
			if ctx.Err() != nil {
				return nil, errors.New("Amnezia gateway and its fallback routes are unreachable.")
			}
			data, err := request(ctx, g.client, "GET", storage+name, nil)
			if err != nil {
				trace("fallback list", err)
				continue
			}
			data, err = base64.StdEncoding.DecodeString(strings.TrimSpace(string(data)))
			if err != nil {
				continue
			}
			data, err = cbc(data, h[:32], h[32:48], true)
			if err != nil {
				continue
			}
			var relays []string
			if json.Unmarshal(data, &relays) != nil {
				continue
			}
			trace("fallback list decoded", nil)
			for _, relay := range relays {
				u, err := url.Parse(relay)
				if err != nil || u.Scheme != "https" || u.Host == "" || u.User != nil || seen[relay] {
					continue
				}
				seen[relay] = true
				if result, err := attempt(relay); err == nil {
					return result, nil
				} else {
					trace("fallback relay", err)
				}
			}
		}
	}
	return nil, errors.New("Amnezia gateway and its fallback routes are unreachable.")
}

type account struct {
	PrivateKey   string `json:"private_key"`
	Installation string `json:"installation_uuid"`
	Config       object `json:"config"`
	Profile      string `json:"profile"`
	Expires      string `json:"expires_at"`
	CaptchaID    string `json:"captcha_id,omitempty"`
}

func saveAccount(path string, a account) error {
	b, e := json.Marshal(a)
	if e != nil {
		return e
	}
	f, e := os.CreateTemp(filepath.Dir(path), ".account-")
	if e != nil {
		return e
	}
	defer os.Remove(f.Name())
	if e = f.Chmod(0600); e == nil {
		_, e = f.Write(b)
	}
	closeErr := f.Close()
	if e == nil {
		e = closeErr
	}
	if e != nil {
		return e
	}
	return os.Rename(f.Name(), path)
}

func usable(a account, now time.Time) bool {
	if a.Profile == "" {
		return false
	}
	if a.Expires == "" {
		return true
	}
	t, e := time.Parse(time.RFC3339Nano, strings.Replace(a.Expires, " ", "T", 1))
	return e == nil && now.Add(5*time.Minute).Before(t)
}

func resolve(ctx context.Context, link, cache string, offline bool, g gateway) (string, error) {
	m, e := decodeLink(link)
	if e != nil {
		return "", e
	}
	api := obj(m["api_config"])
	service := text(api, "service_type")
	country := text(api, "user_country_code")
	nativeProfile, nativeError := profile(m)
	if nativeError == nil && service == "" {
		return nativeProfile, nil
	}
	if service != "amnezia-free" && service != "amnezia-premium" && service != "external-premium" {
		return "", errors.New("Unsupported Amnezia subscription type.")
	}
	if p := text(api, "service_protocol"); p != "" && p != "awg" {
		return "", errors.New("Only AmneziaWG API configurations are supported.")
	}
	if service != "amnezia-free" && text(obj(m["auth_data"]), "api_key") == "" {
		return "", errors.New("Amnezia subscription credentials are missing.")
	}
	if e = os.MkdirAll(cache, 0700); e != nil {
		return "", e
	}
	id := sha256.Sum256([]byte(link))
	path := filepath.Join(cache, hex.EncodeToString(id[:])+".json")
	lock, e := os.OpenFile(path+".lock", os.O_CREATE|os.O_RDWR, 0600)
	if e != nil {
		return "", e
	}
	defer lock.Close()
	for syscall.Flock(int(lock.Fd()), syscall.LOCK_EX|syscall.LOCK_NB) != nil {
		select {
		case <-ctx.Done():
			return "", errors.New("Amnezia configuration is busy.")
		case <-time.After(100 * time.Millisecond):
		}
	}
	defer syscall.Flock(int(lock.Fd()), syscall.LOCK_UN)
	var a account
	loaded := false
	if b, err := os.ReadFile(path); err == nil {
		if json.Unmarshal(b, &a) != nil {
			return "", errors.New("Stored Amnezia account is damaged.")
		}
		loaded = true
	}
	if !loaded && nativeError == nil {
		a.Config = m
		a.Profile = nativeProfile
		a.Expires = text(obj(api["public_key"]), "expires_at")
		for _, line := range strings.Split(nativeProfile, "\n") {
			parts := strings.SplitN(line, "=", 2)
			if len(parts) == 2 && strings.TrimSpace(parts[0]) == "PrivateKey" {
				a.PrivateKey = strings.TrimSpace(parts[1])
				break
			}
		}
		if e = saveAccount(path, a); e != nil {
			return "", e
		}
	}
	if usable(a, time.Now()) {
		return a.Profile, nil
	}
	if offline {
		return "", errors.New("Amnezia configuration must be refreshed online.")
	}
	if a.PrivateKey == "" {
		key, err := ecdh.X25519().GenerateKey(rand.Reader)
		if err != nil {
			return "", err
		}
		a.PrivateKey = base64.StdEncoding.EncodeToString(key.Bytes())
	}
	private, err := decode64(a.PrivateKey)
	if err != nil {
		return "", errors.New("Invalid stored Amnezia private key.")
	}
	key, err := ecdh.X25519().NewPrivateKey(private)
	if err != nil {
		return "", err
	}
	if a.Installation == "" {
		b := make([]byte, 16)
		if _, e = rand.Read(b); e != nil {
			return "", e
		}
		b[6] = (b[6] & 15) | 64
		b[8] = (b[8] & 63) | 128
		s := hex.EncodeToString(b)
		a.Installation = s[:8] + "-" + s[8:12] + "-" + s[12:16] + "-" + s[16:20] + "-" + s[20:]
	}
	if e = saveAccount(path, a); e != nil {
		return "", e
	}
	if a.Config != nil {
		m = a.Config
		api = obj(m["api_config"])
	}
	payload := object{"os_version": "linux", "app_version": "5.1.0.6", "cli_name": "Zirgozar", "app_language": "fa", "installation_uuid": a.Installation, "service_type": service, "service_protocol": "awg", "user_country_code": country, "public_key": base64.StdEncoding.EncodeToString(key.PublicKey().Bytes())}
	if auth := obj(m["auth_data"]); auth != nil {
		payload["auth_data"] = auth
	}
	if solution := os.Getenv("ZGZ_AMNEZIA_CAPTCHA_SOLUTION"); solution != "" && a.CaptchaID != "" {
		payload["captcha_id"] = a.CaptchaID
		payload["captcha_solution"] = strings.ToUpper(strings.TrimSpace(solution))
	}
	if s := text(api, "server_country_code"); s != "" {
		payload["server_country_code"] = s
	}
	response, e := g.post(ctx, "v1/config", payload, service, country)
	if e != nil {
		return "", e
	}
	if id, image := text(response, "captcha_id"), text(response, "captcha_image"); id != "" && image != "" {
		a.CaptchaID = id
		if e = saveAccount(path, a); e != nil {
			return "", e
		}
		if target := os.Getenv("ZGZ_AMNEZIA_CHALLENGE"); target != "" {
			challenge, _ := json.Marshal(object{"image": image})
			if e = os.WriteFile(target, challenge, 0600); e != nil {
				return "", e
			}
			return "", errors.New("Enter the Amnezia verification code shown below.")
		}
		return "", errors.New("Amnezia verification is required. Import the same link again from Configs to enter the code.")
	}
	if status, ok := response["http_status"].(float64); ok && (status < 200 || status >= 300) {
		return "", fmt.Errorf("Amnezia API rejected the request (status %d).", int(status))
	}
	result, e := decodeLink(text(response, "config"))
	if e != nil {
		return "", errors.New("Amnezia did not return a usable configuration.")
	}
	b, _ := json.Marshal(result)
	b = bytes.ReplaceAll(b, []byte("$WIREGUARD_CLIENT_PRIVATE_KEY"), []byte(a.PrivateKey))
	_ = json.Unmarshal(b, &result)
	s, e := profile(result)
	if e != nil {
		return "", e
	}
	resultAPI := obj(result["api_config"])
	if resultAPI == nil {
		resultAPI = object{}
		result["api_config"] = resultAPI
	}
	resultAPI["service_type"] = service
	resultAPI["service_protocol"] = "awg"
	resultAPI["user_country_code"] = country
	if result["auth_data"] == nil && m["auth_data"] != nil {
		result["auth_data"] = m["auth_data"]
	}
	if code := text(result, "server_country_code"); code != "" {
		resultAPI["server_country_code"] = code
	}
	label := "AmneziaWG"
	if service == "amnezia-free" {
		label = "Amnezia Free " + strings.ToUpper(country)
	}
	s = "# " + label + "\n" + s
	a.Config = result
	a.CaptchaID = ""
	a.Profile = s
	a.Expires = text(obj(obj(result["api_config"])["public_key"]), "expires_at")
	if e = saveAccount(path, a); e != nil {
		return "", e
	}
	return s, nil
}

func main() {
	cache := flag.String("cache", "/etc/zirgozar/amnezia", "account directory")
	offline := flag.Bool("offline", false, "use an existing configuration only")
	flag.Parse()
	ctx, cancel := context.WithTimeout(context.Background(), 28*time.Second)
	defer cancel()
	b, e := readBounded(os.Stdin)
	if e == nil {
		var client *http.Client
		client, e = newHTTP(os.Getenv("ZGZ_AMNEZIA_PROXY"))
		if e == nil {
			g := gateway{client: client, key: gatewayKey, endpoint: "http://gw.amnezia.org:80/", stores: storages}
			var s string
			s, e = resolve(ctx, strings.TrimSpace(string(b)), *cache, *offline, g)
			if e == nil {
				fmt.Println(s)
				return
			}
		}
	}
	// Never print raw network errors, API responses, keys or configuration text.
	if e != nil {
		fmt.Fprintln(os.Stderr, e.Error())
	}
	os.Exit(1)
}

func trace(stage string, err error) {
	if os.Getenv("ZGZ_AMNEZIA_TRACE") == "1" {
		if err == nil {
			fmt.Fprintln(os.Stderr, stage+": ok")
		} else {
			fmt.Fprintln(os.Stderr, stage+": "+err.Error())
		}
	}
}
