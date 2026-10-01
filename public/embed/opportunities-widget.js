/**
 * ARIA HUB opportunities widget — no-code embed for partner websites.
 *
 * Usage (partner pastes this into their HTML):
 *   <div id="aria-hub-opportunities"></div>
 *   <script src="https://www.myariahub.com/embed/opportunities-widget.js"
 *           data-aria-partner="your-name"
 *           data-aria-limit="8"
 *           data-aria-category="scholarship"
 *           data-aria-country="Afghanistan"
 *           data-aria-province="Kabul"
 *           data-aria-deadline-days="30"></script>
 *
 * Only data-aria-partner is required for attribution; every filter is optional.
 * Data comes from the public JSON feed /api/partners/feed and every opportunity
 * link already carries the partner's UTM parameters.
 */
(function () {
  'use strict';

  var script =
    document.currentScript ||
    (function () {
      var all = document.getElementsByTagName('script');
      for (var i = all.length - 1; i >= 0; i--) {
        if (all[i].src && all[i].src.indexOf('opportunities-widget.js') !== -1) return all[i];
      }
      return null;
    })();

  if (!script) return;

  var BASE = 'https://www.myariahub.com';
  var data = script.dataset || {};
  var containerId = data.ariaContainer || 'aria-hub-opportunities';
  var container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    script.parentNode.insertBefore(container, script);
  }

  var params = [];
  params.push('limit=' + encodeURIComponent(data.ariaLimit || '8'));
  if (data.ariaPartner) params.push('partner=' + encodeURIComponent(data.ariaPartner));
  if (data.ariaCategory) params.push('category=' + encodeURIComponent(data.ariaCategory));
  if (data.ariaCountry) params.push('country=' + encodeURIComponent(data.ariaCountry));
  if (data.ariaProvince) params.push('province=' + encodeURIComponent(data.ariaProvince));
  if (data.ariaDeadlineDays) params.push('deadlineDays=' + encodeURIComponent(data.ariaDeadlineDays));

  function esc(s) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(s == null ? '' : String(s)));
    return div.innerHTML;
  }

  function render(items, attribution) {
    var html = '<ul style="list-style:none;margin:0;padding:0;font-family:inherit">';
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var meta = [];
      if (it.organization) meta.push(esc(it.organization));
      if (it.location) meta.push(esc(it.location));
      if (it.deadline) meta.push('⏳ ' + esc(it.deadline));
      html +=
        '<li style="padding:10px 0;border-bottom:1px solid rgba(128,128,128,0.2)">' +
        '<a href="' + esc(it.url) + '" target="_blank" rel="noopener" ' +
        'style="font-weight:600;text-decoration:none">' + esc(it.title) + '</a>' +
        (meta.length ? '<div style="font-size:0.85em;opacity:0.75;margin-top:2px">' + meta.join(' · ') + '</div>' : '') +
        '</li>';
    }
    html += '</ul>';
    if (attribution && attribution.text && attribution.url) {
      html +=
        '<div style="margin-top:10px;font-size:0.8em;opacity:0.75">' +
        '<a href="' + esc(attribution.url) + '" target="_blank" rel="noopener">' + esc(attribution.text) + '</a></div>';
    }
    container.innerHTML = html;
  }

  fetch(BASE + '/api/partners/feed?' + params.join('&'))
    .then(function (res) { return res.ok ? res.json() : null; })
    .then(function (payload) {
      if (payload && payload.items) render(payload.items, payload.attribution);
      else container.innerHTML = '';
    })
    .catch(function () {
      container.innerHTML = '';
    });
})();
