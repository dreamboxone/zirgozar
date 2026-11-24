// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
package main

import (
	"bytes"
	"compress/zlib"
	"context"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha512"
	"crypto/x509"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"encoding/pem"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func vpn(m object, compressed bool) string {
	b, _ := json.Marshal(m)
	if compressed {
		var out bytes.Buffer
		w := zlib.NewWriter(&out)
		w.Write(b)
		w.Close()
		size := make([]byte, 4)
		binary.BigEndian.PutUint32(size, uint32(len(b)))
		b = append(size, out.Bytes()...)
	}
	return "vpn://" + base64.RawURLEncoding.EncodeToString(b)
}

func native(s string) object {
	last, _ := json.Marshal(object{"config": s})
	return object{"containers": []any{object{"container": "amnezia-awg", "amnezia-awg": object{"last_config": string(last)}}}}
}

const testProfile = "[Interface]\nPrivateKey = $WIREGUARD_CLIENT_PRIVATE_KEY\nAddress = 10.7.0.2/32\nJc = 4\nJmin = 40\nJmax = 70\nH1 = 100-200\nI1 = <b 0x12>\n[Peer]\nPublicKey = AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=\nEndpoint = 192.0.2.10:51820\nAllowedIPs = 0.0.0.0/0\n"

func TestDecode(t *testing.T) {
	for _, compressed := range []bool{false, true} {
		m, e := decodeLink(vpn(native(strings.ReplaceAll(testProfile, "$WIREGUARD_CLIENT_PRIVATE_KEY", "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=")), compressed))
		if e != nil {
			t.Fatal(e)
		}
		s, e := profile(m)
		if e != nil || !strings.Contains(s, "H1 = 100-200") {
			t.Fatalf("native parameters lost: %v", e)
		}
	}
	if _, e := decodeLink(vpn(object{"config_version": 1.0, "api_endpoint": "https://invalid.example/", "api_key": "secret"}, false)); e == nil || e.Error() != legacyError {
		t.Fatal("legacy API was not rejected")
	}
	if _, e := decodeLink("vpn://invalid!"); e == nil {
		t.Fatal("accepted corrupt base64")
	}
	var out bytes.Buffer
	out.Write([]byte{0, 0, 0, 1})
	w := zlib.NewWriter(&out)
	w.Write(bytes.Repeat([]byte{'a'}, maxDocument+1))
	w.Close()
	if _, e := decodeLink("vpn://" + base64.RawURLEncoding.EncodeToString(out.Bytes())); e == nil {
		t.Fatal("accepted oversized compressed data")
	}
}

func fakeGateway(t *testing.T, respond func(object) (int, object)) (*httptest.Server, []byte) {
	t.Helper()
	key, e := rsa.GenerateKey(rand.Reader, 2048)
	if e != nil {
		t.Fatal(e)
	}
	der, _ := x509.MarshalPKIXPublicKey(&key.PublicKey)
	pub := pem.EncodeToMemory(&pem.Block{Type: "PUBLIC KEY", Bytes: der})
	s := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var wire map[string]string
		if e := json.NewDecoder(r.Body).Decode(&wire); e != nil {
			t.Error(e)
			w.WriteHeader(500)
			return
		}
		sealed, _ := base64.StdEncoding.DecodeString(wire["key_payload"])
		plain, e := rsa.DecryptPKCS1v15(rand.Reader, key, sealed)
		if e != nil {
			t.Error(e)
			return
		}
		var keys map[string]string
		json.Unmarshal(plain, &keys)
		aesKey, _ := base64.StdEncoding.DecodeString(keys["aes_key"])
		iv, _ := base64.StdEncoding.DecodeString(keys["aes_iv"])
		if len(iv) != 32 {
			t.Error("wire IV length must be 32")
		}
		ct, _ := base64.StdEncoding.DecodeString(wire["api_payload"])
		plain, e = cbc(ct, aesKey, iv, true)
		if e != nil {
			t.Error(e)
			return
		}
		var payload object
		json.Unmarshal(plain, &payload)
		status, result := respond(payload)
		plain, _ = json.Marshal(result)
		ct, _ = cbc(plain, aesKey, iv, false)
		w.WriteHeader(status)
		w.Write(ct)
	}))
	t.Cleanup(s.Close)
	return s, pub
}

func TestCaptchaWhenSelectingSavedLink(t *testing.T) {
	t.Setenv("ZGZ_AMNEZIA_CHALLENGE", "")
	s, key := fakeGateway(t, func(p object) (int, object) {
		return 402, object{"http_status": 402, "captcha_id": "challenge-1", "captcha_image": "aW1hZ2U="}
	})
	g := gateway{client: s.Client(), key: key, endpoint: s.URL}
	_, err := resolve(context.Background(), "amnezia://free?country=ir", t.TempDir(), false, g)
	if err == nil || !strings.Contains(err.Error(), "Import the same link again from Configs") {
		t.Fatalf("expected renewal instructions outside the import dialog: %v", err)
	}
}

func TestCaptchaAccountAndCache(t *testing.T) {
	count := 0
	pubkey, installation := "", ""
	s, key := fakeGateway(t, func(p object) (int, object) {
		count++
		if count == 1 {
			pubkey = text(p, "public_key")
			installation = text(p, "installation_uuid")
			return 402, object{"http_status": 402, "captcha_id": "challenge-1", "captcha_image": "aW1hZ2U="}
		}
		if text(p, "public_key") != pubkey || text(p, "installation_uuid") != installation || text(p, "captcha_id") != "challenge-1" || text(p, "captcha_solution") != "AB12" {
			t.Error("CAPTCHA retry changed identity or lost answer")
		}
		m := native(testProfile)
		m["api_config"] = object{"service_type": "amnezia-free", "public_key": object{"expires_at": time.Now().Add(time.Hour).UTC().Format(time.RFC3339)}}
		return 201, object{"http_status": 201, "config": vpn(m, true)}
	})
	g := gateway{client: s.Client(), key: key, endpoint: s.URL}
	cache := t.TempDir()
	challenge := filepath.Join(t.TempDir(), "challenge.json")
	t.Setenv("ZGZ_AMNEZIA_CHALLENGE", challenge)
	link := "amnezia://free?country=ir"
	if _, e := resolve(context.Background(), link, cache, false, g); e == nil || !strings.Contains(e.Error(), "verification code") {
		t.Fatalf("expected CAPTCHA: %v", e)
	}
	if b, e := os.ReadFile(challenge); e != nil || !bytes.Contains(b, []byte("aW1hZ2U=")) {
		t.Fatal("challenge missing")
	}
	t.Setenv("ZGZ_AMNEZIA_CAPTCHA_SOLUTION", " ab12 ")
	profile, e := resolve(context.Background(), link, cache, false, g)
	if e != nil {
		t.Fatal(e)
	}
	if strings.Contains(profile, "$WIREGUARD") || !strings.Contains(profile, "I1 = <b 0x12>") {
		t.Fatal("profile keys or AWG parameters corrupted")
	}
	cached, e := resolve(context.Background(), link, cache, true, g)
	if e != nil || cached != profile || count != 2 {
		t.Fatal("cached profile required network access")
	}
	files, _ := filepath.Glob(filepath.Join(cache, "*.json"))
	st, _ := os.Stat(files[0])
	if st.Mode().Perm() != 0600 {
		t.Fatal("account is not private")
	}
	var a account
	b, _ := os.ReadFile(files[0])
	json.Unmarshal(b, &a)
	a.Expires = time.Now().Add(-time.Hour).UTC().Format(time.RFC3339)
	saveAccount(files[0], a)
	if _, e := resolve(context.Background(), link, cache, true, g); e == nil {
		t.Fatal("used an expired profile")
	}
}

func TestEncryptedAPIError(t *testing.T) {
	s, key := fakeGateway(t, func(object) (int, object) { return 402, object{"http_status": 402, "message": "subscription expired"} })
	g := gateway{client: s.Client(), key: key, endpoint: s.URL}
	r, e := g.post(context.Background(), "v1/config", object{}, "amnezia-free", "ir")
	if e != nil || r["http_status"] != float64(402) {
		t.Fatalf("encrypted HTTP error lost: %v", e)
	}
}

func TestFallbackStorageAndRelay(t *testing.T) {
	server, key := fakeGateway(t, func(object) (int, object) { return 200, object{"http_status": 200} })
	// Use a TLS relay with its own trusted test transport.
	relay := httptest.NewTLSServer(server.Config.Handler)
	defer relay.Close()
	direct := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(503) }))
	defer direct.Close()
	list, _ := json.Marshal([]string{relay.URL})
	h := sha512.Sum512(key)
	encrypted, _ := cbc(list, h[:32], h[32:48], false)
	storage := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(base64.StdEncoding.EncodeToString(encrypted)))
	}))
	defer storage.Close()
	g := gateway{client: relay.Client(), key: key, endpoint: direct.URL, stores: []string{storage.URL + "/"}}
	r, e := g.post(context.Background(), "v1/config", object{}, "amnezia-free", "ir")
	if e != nil || r["http_status"] != float64(200) {
		t.Fatalf("fallback failed: %v", e)
	}
}

func TestPaddingValidation(t *testing.T) {
	key := make([]byte, 32)
	iv := make([]byte, 32)
	ct, _ := cbc([]byte("hello"), key, iv, false)
	ct[len(ct)-1] ^= 1
	if _, e := cbc(ct, key, iv, true); e == nil {
		t.Fatal("accepted damaged ciphertext")
	}
}

func TestProviderExpiryFormat(t *testing.T) {
	stamp := time.Now().Add(time.Hour).UTC().Format("2006-01-02 15:04:05.999999+00:00")
	if !usable(account{Profile: "test", Expires: stamp}, time.Now()) {
		t.Fatal("provider SQL-style timestamp should be accepted")
	}
	if usable(account{Profile: "test", Expires: "invalid"}, time.Now()) {
		t.Fatal("invalid expiry must fail closed")
	}
}
