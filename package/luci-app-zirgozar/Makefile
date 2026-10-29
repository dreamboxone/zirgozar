# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
# Part of Zirgozar - https://github.com/dreamboxone/zirgozar

include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-zirgozar
PKG_VERSION:=5.8.7
PKG_RELEASE:=5

PKG_MAINTAINER:=routekernel <https://t.me/routekernel1>
PKG_LICENSE:=AGPL-3.0-or-later
PKG_ARCH:=all

include $(INCLUDE_DIR)/package.mk

define Package/luci-app-zirgozar
  SECTION:=luci
  CATEGORY:=LuCI
  SUBMENU:=3. Applications
  TITLE:=Compatibility package for the unified Zirgozar package
  URL:=https://github.com/dreamboxone/zirgozar
  DEPENDS:=+zirgozar
  EXTRA_DEPENDS:=zirgozar (>= $(PKG_VERSION)-$(PKG_RELEASE))
  PKGARCH:=all
endef

define Package/luci-app-zirgozar/description
 Transitional package for older updaters. The web interface is included in zirgozar.
endef

define Build/Compile
endef

define Package/luci-app-zirgozar/install
	# Compatibility package: all interface files belong to zirgozar.
	$(INSTALL_DIR) $(1)/usr/share/doc/luci-app-zirgozar
	$(INSTALL_DATA) ../../LICENSE $(1)/usr/share/doc/luci-app-zirgozar/LICENSE
endef


$(eval $(call BuildPackage,luci-app-zirgozar))
