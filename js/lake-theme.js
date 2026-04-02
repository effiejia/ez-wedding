/* lake-theme.js – navigation & interactions */

document.addEventListener('DOMContentLoaded', function () {

  // ── Sticky nav on scroll ──
  const nav = document.querySelector('.nav');
  window.addEventListener('scroll', function () {
    if (window.scrollY > 60) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  });

  // ── Mobile hamburger ──
  const hamburger = document.querySelector('.hamburger');
  if (hamburger) {
    hamburger.addEventListener('click', function () {
      hamburger.classList.toggle('open');
      nav.classList.toggle('open');
    });

    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        hamburger.classList.remove('open');
        nav.classList.remove('open');
      });
    });
  }

  // ── FAQ accordion ──
  document.querySelectorAll('.faq-question').forEach(function (question) {
    question.addEventListener('click', function () {
      const item = this.closest('.faq-item');
      const isOpen = item.classList.contains('open');

      // close all
      document.querySelectorAll('.faq-item').forEach(function (el) {
        el.classList.remove('open');
      });

      // open clicked (if it wasn't already open)
      if (!isOpen) {
        item.classList.add('open');
      }
    });
  });

  // ── RSVP: three-phase flow (lookup → form → success) ──
  var rsvpLookupPanel = document.getElementById('rsvp-lookup');
  var rsvpLookupForm  = document.getElementById('rsvp-lookup-form');
  var rsvpForm        = document.getElementById('rsvp-form');
  var rsvpBackBtn     = document.getElementById('rsvp-back-btn');
  var rsvpEditBtn     = document.getElementById('rsvp-edit-btn');
  var rsvpActionInput = document.getElementById('rsvp-action');
  var rsvpPlusOneWrap = document.getElementById('rsvp-plusone');
  var rsvpSubmitBtn   = document.getElementById('rsvp-submit-btn');
  var rsvpAlert       = document.getElementById('rsvp-alert');
  var rsvpSuccess     = document.getElementById('rsvp-success');

  if (rsvpLookupPanel) {
    var cfg       = typeof window.RSVP_CONFIG !== 'undefined' ? window.RSVP_CONFIG : {};
    var scriptUrl = cfg.googleScriptUrl ? String(cfg.googleScriptUrl).trim() : '';

    function showAlert(kind, message) {
      if (!rsvpAlert) return;
      rsvpAlert.hidden = false;
      rsvpAlert.className = 'rsvp-alert rsvp-alert--' + kind;
      rsvpAlert.textContent = message;
      rsvpAlert.setAttribute('aria-live', 'polite');
    }

    function hideAlert() {
      if (!rsvpAlert) return;
      rsvpAlert.hidden = true;
      rsvpAlert.textContent = '';
      rsvpAlert.className = 'rsvp-alert';
      rsvpAlert.removeAttribute('aria-live');
    }

    function postToScript(params, onSuccess, onError) {
      if (!scriptUrl) {
        onError('RSVP is not configured \u2014 add your Google Apps Script URL to js/rsvp-config.js.');
        return;
      }
      fetch(scriptUrl, { method: 'POST', mode: 'cors', body: params })
        .then(function (res) {
          return res.text().then(function (t) { return { ok: res.ok, status: res.status, text: t }; });
        })
        .then(function (result) {
          var data = null;
          try { data = JSON.parse(result.text); } catch (e) { data = null; }
          if (data && data.result === 'error') { onError(data.message || 'Something went wrong.'); return; }
          if (!result.ok) { onError('Server error (HTTP ' + result.status + ').'); return; }
          onSuccess(data);
        })
        .catch(function () { onError('Network error \u2014 check your connection and try again.'); });
    }

    // Build plus-one section: notice + a single count picker (0…max)
    function buildPlusOneBlocks(max, prefill) {
      if (!rsvpPlusOneWrap) return;
      rsvpPlusOneWrap.innerHTML = '';
      if (!max || max < 1) return;

      var savedCount = prefill && prefill['plusone_count'] != null
        ? parseInt(prefill['plusone_count'], 10) : '';

      var options = '<option value="" disabled' + (savedCount === '' ? ' selected' : '') + '>Select</option>';
      for (var i = 0; i <= max; i++) {
        options += '<option value="' + i + '"' + (savedCount === i ? ' selected' : '') + '>' + i + '</option>';
      }

      var label = max === 1 ? 'plus one' : 'additional guests';
      rsvpPlusOneWrap.innerHTML =
        '<div class="rsvp-plusone-notice">' +
          'Good news \u2014 your invitation includes up to ' + max + ' ' + label + '!' +
        '</div>' +
        '<div class="form-group">' +
          '<label for="plusone_count">How many will be attending?</label>' +
          '<select id="plusone_count" name="plusone_count">' + options + '</select>' +
        '</div>';
    }

    function showFormPanel(guestName, inviteCode, plusOneCount, prefillRow, action) {
      rsvpLookupPanel.style.display = 'none';
      hideAlert();

      // Set hidden identity fields
      var nameHidden = document.getElementById('rsvp-name-hidden');
      var codeHidden = document.getElementById('rsvp-code-hidden');
      var nameDisplay = document.getElementById('rsvp-name-display');
      if (nameHidden) nameHidden.value = guestName;
      if (codeHidden) codeHidden.value = inviteCode;
      if (nameDisplay) nameDisplay.textContent = guestName;

      // Reset then prefill editable fields (always reset so stale values don't carry over)
      ['email', 'attendance', 'dietary', 'message'].forEach(function (field) {
        var el = document.getElementById(field);
        if (el) el.value = prefillRow && prefillRow[field] != null ? prefillRow[field] : '';
      });

      // Build plus-one section
      buildPlusOneBlocks(plusOneCount, prefillRow);

      if (rsvpActionInput) rsvpActionInput.value = action;
      if (rsvpSubmitBtn) {
        rsvpSubmitBtn.textContent = action === 'update' ? 'Update RSVP' : 'Confirm RSVP';
      }

      rsvpForm.style.display = '';
    }

    // Phase 1: Lookup
    if (rsvpLookupForm) {
      rsvpLookupForm.addEventListener('submit', function (ev) {
        ev.preventDefault();
        hideAlert();

        var nameVal = document.getElementById('lookup_name') ? document.getElementById('lookup_name').value.trim() : '';
        var codeVal = document.getElementById('lookup_invite_code') ? document.getElementById('lookup_invite_code').value.trim() : '';

        var lookupBtn = rsvpLookupForm.querySelector('button[type="submit"]');
        if (lookupBtn) lookupBtn.disabled = true;
        showAlert('info', 'Looking up your invitation\u2026');

        postToScript(
          new URLSearchParams({ action: 'lookup', name: nameVal, invite_code: codeVal }),
          function (data) {
            if (lookupBtn) lookupBtn.disabled = false;

            if (!data || data.result === 'invalid') {
              showAlert('danger', 'We couldn\u2019t find an invitation matching that name and code. Please double-check and try again.');
              return;
            }

            var plusOneCount = parseInt(data.plusone_amount, 10) || 0;
            var prefillRow   = (data.result === 'found') ? data.row : null;
            var action       = (data.result === 'found') ? 'update' : 'submit';

            showFormPanel(nameVal, codeVal, plusOneCount, prefillRow, action);

            if (action === 'update') {
              showAlert('info', 'We found your existing RSVP. Update any details below and resubmit.');
            }
          },
          function (msg) {
            if (lookupBtn) lookupBtn.disabled = false;
            showAlert('danger', msg);
          }
        );
      });
    }

    // Back to lookup panel
    if (rsvpBackBtn) {
      rsvpBackBtn.addEventListener('click', function () {
        rsvpForm.style.display = 'none';
        if (rsvpPlusOneWrap) rsvpPlusOneWrap.innerHTML = '';
        rsvpLookupPanel.style.display = '';
        hideAlert();
      });
    }

    // Edit RSVP — return to the form with data intact, switching action to update
    if (rsvpEditBtn) {
      rsvpEditBtn.addEventListener('click', function () {
        if (rsvpSuccess) rsvpSuccess.style.display = 'none';
        if (rsvpActionInput) rsvpActionInput.value = 'update';
        if (rsvpSubmitBtn) {
          rsvpSubmitBtn.textContent = 'Update RSVP';
          rsvpSubmitBtn.disabled = false;
        }
        rsvpForm.style.display = '';
        hideAlert();
      });
    }

    // Phase 2: Submit / Update
    if (rsvpForm) {
      rsvpForm.addEventListener('submit', function (ev) {
        ev.preventDefault();
        hideAlert();
        if (rsvpSubmitBtn) rsvpSubmitBtn.disabled = true;
        showAlert('info', 'Just a sec \u2014 sending your RSVP\u2026');

        postToScript(
          new URLSearchParams(new FormData(rsvpForm)),
          function () {
            rsvpForm.style.display = 'none';
            rsvpLookupPanel.style.display = 'none';
            hideAlert();
            if (rsvpSuccess) rsvpSuccess.style.display = 'block';
          },
          function (msg) {
            if (rsvpSubmitBtn) rsvpSubmitBtn.disabled = false;
            showAlert('danger', msg);
          }
        );
      });
    }
  }

  // ── Our story image carousel ──
  document.querySelectorAll('[data-story-carousel]').forEach(function (root) {
    const track = root.querySelector('.story-carousel-track');
    const viewport = root.querySelector('.story-carousel-viewport');
    const slides = root.querySelectorAll('.story-carousel-slide');
    const prevBtn = root.querySelector('.story-carousel-prev');
    const nextBtn = root.querySelector('.story-carousel-next');
    const dotsWrap = root.querySelector('.story-carousel-dots');
    const captionEl = root.querySelector('.story-carousel-caption');
    if (!track || !slides.length || !prevBtn || !nextBtn || !dotsWrap) return;

    const total = slides.length;
    let index = 0;
    const prefersReduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function setAria() {
      slides.forEach(function (slide, i) {
        slide.setAttribute('aria-hidden', i === index ? 'false' : 'true');
      });
      const dotBtns = dotsWrap.querySelectorAll('button');
      dotBtns.forEach(function (dot, i) {
        dot.setAttribute('aria-selected', i === index ? 'true' : 'false');
        dot.tabIndex = i === index ? 0 : -1;
      });
    }

    function goTo(i) {
      index = ((i % total) + total) % total;
      track.style.transform = 'translateX(-' + index * 100 + '%)';
      setAria();
      if (captionEl) {
        const text = slides[index].getAttribute('data-caption') || '';
        captionEl.textContent = text;
        captionEl.hidden = !text;
      }
    }

    dotsWrap.innerHTML = '';
    for (let i = 0; i < total; i++) {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', 'Photo ' + (i + 1) + ' of ' + total);
      dot.addEventListener('click', function () {
        goTo(i);
      });
      dotsWrap.appendChild(dot);
    }

    prevBtn.addEventListener('click', function () {
      goTo(index - 1);
    });
    nextBtn.addEventListener('click', function () {
      goTo(index + 1);
    });

    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goTo(index - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goTo(index + 1);
      }
    });

    if (viewport) {
      let touchStartX = 0;
      viewport.addEventListener(
        'touchstart',
        function (e) {
          touchStartX = e.touches[0].clientX;
        },
        { passive: true }
      );
      viewport.addEventListener('touchend', function (e) {
        const dx = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(dx) < 45) return;
        if (dx < 0) goTo(index + 1);
        else goTo(index - 1);
      });
    }

    goTo(0);
  });

  // ── Fade-in on scroll ──
  const fadeEls = document.querySelectorAll('.fade-in');
  if (fadeEls.length) {
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    fadeEls.forEach(function (el) {
      observer.observe(el);
    });
  }
});
