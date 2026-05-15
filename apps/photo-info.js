(function () {
  "use strict";

  function _parsePhotoValues(raw) {
    if (raw == null) return [];
    if (Array.isArray(raw)) return raw.filter(Boolean);
    var value = String(raw).trim();
    if (!value) return [];

    try {
      var parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
      if (typeof parsed === "string") return _parsePhotoValues(parsed);
    } catch (err) {
      // ignore
    }

    return value
      .split(/[\r\n,;]+/)
      .map(function (part) { return part.trim(); })
      .filter(Boolean);
  }

  function _isImageUrl(value) {
    if (typeof value !== "string") return false;
    var trimmed = value.trim();
    return /^(https?:\/\/|\/|data:image\/|blob:)/i.test(trimmed);
  }

  function _buildPhotoHtml(urls) {
    var container = document.createElement("div");
    container.className = "cnig-photo-gallery";
    urls.forEach(function (url) {
      var img = document.createElement("img");
      img.className = "cnig-photo-gallery-item";
      img.src = url;
      img.alt = "Photo de l'entité";
      img.onerror = function () { this.style.display = "none"; };
      container.appendChild(img);
    });
    return container;
  }

  function _injectStyles() {
    if (document.getElementById("cnig-photo-info-style")) return;
    var style = document.createElement("style");
    style.id = "cnig-photo-info-style";
    style.textContent = ""
      + ".cnig-photo-gallery { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }"
      + ".cnig-photo-gallery-item { max-width: 100%; height: auto; border-radius: 6px; border: 1px solid rgba(0,0,0,.1); box-shadow: 0 1px 4px rgba(0,0,0,.08); }"
      + ".cnig-photo-row { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; }"
      + ".cnig-photo-row-label { font-weight: 600; margin-bottom: 4px; }";
    document.head.appendChild(style);
  }

  function _findPhotoLabelNodes(root) {
    if (!root) return [];
    var nodes = [];
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
      acceptNode: function (node) {
        if (!node.textContent) return NodeFilter.FILTER_REJECT;
        var text = node.textContent.trim().toLowerCase();
        if (text.indexOf("photo") >= 0 && /photo\s*[:=]?$/i.test(text)) {
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_SKIP;
      }
    });
    var node;
    while ((node = walker.nextNode())) {
      nodes.push(node);
    }
    return nodes;
  }

  function _extractLabelAndValue(node) {
    var text = node.textContent || "";
    var parts = text.split(/[:=]/);
    if (parts.length < 2) {
      return { label: text.trim(), value: "" };
    }
    return {
      label: parts[0].trim(),
      value: parts.slice(1).join(":").trim(),
    };
  }

  function _replacePhotoRow(node) {
    var info = _extractLabelAndValue(node);
    var urls = _parsePhotoValues(info.value);
    if (!urls.length) {
      if (/^photo\s*[:=]?$/i.test(info.label)) {
        var valueNode = node.nextElementSibling || node.parentNode && node.parentNode.querySelector(":scope > *:nth-child(2)");
        if (valueNode) {
          urls = _parsePhotoValues(valueNode.textContent);
          node = valueNode.parentNode || valueNode;
        }
      }
    }
    if (!urls.length) return false;
    var imageUrls = urls.filter(_isImageUrl);
    if (!imageUrls.length) return false;

    var row = document.createElement("div");
    row.className = "cnig-photo-row";
    var label = document.createElement("div");
    label.className = "cnig-photo-row-label";
    label.textContent = info.label.replace(/[:=]$/, "");
    row.appendChild(label);
    row.appendChild(_buildPhotoHtml(imageUrls));

    if (node.parentNode) {
      node.parentNode.replaceChild(row, node);
    }
    return true;
  }

  function _enhanceInfoPanel(root) {
    if (!root) return;
    _injectStyles();
    var photoNodes = _findPhotoLabelNodes(root);
    photoNodes.forEach(function (node) {
      _replacePhotoRow(node);
    });
  }

  function _observeInfoPanel() {
    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (!(node instanceof HTMLElement)) return;
          if (node.querySelector && node.querySelector("img")) return;
          if (/photo/i.test(node.textContent || "")) {
            _enhanceInfoPanel(node);
          }
          if (node.childElementCount > 0) {
            _enhanceInfoPanel(node);
          }
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
    _enhanceInfoPanel(document.body);
  }

  function _init() {
    if (document.readyState !== "loading") {
      _observeInfoPanel();
      return;
    }
    document.addEventListener("DOMContentLoaded", function () {
      _observeInfoPanel();
    });
  }

  _init();
})();
