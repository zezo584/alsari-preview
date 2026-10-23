/**
 * ALSARI JO – front-end interactions (vanilla JS, no dependencies).
 */
(function () {
	'use strict';

	var doc = document;
	var root = doc.documentElement;
	var isRTL = root.getAttribute('dir') === 'rtl';
	var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	var cfg = window.ALSARI || { i18n: {} };

	function $(s, c) { return (c || doc).querySelector(s); }
	function $$(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }

	/* ---------- Header state & back-to-top ---------- */
	var header = $('#site-header');
	var toTop = $('.to-top');
	var ticking = false;
	function onScroll() {
		var y = window.pageYOffset;
		if (header) header.classList.toggle('is-scrolled', y > 30);
		if (toTop) toTop.classList.toggle('is-visible', y > 700);
		ticking = false;
	}
	window.addEventListener('scroll', function () {
		if (!ticking) { window.requestAnimationFrame(onScroll); ticking = true; }
	}, { passive: true });
	onScroll();
	if (toTop) {
		toTop.addEventListener('click', function () {
			window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
		});
	}

	/* ---------- Mobile drawer ---------- */
	var drawer = $('#drawer');
	var burger = $('.burger');
	var lastFocus = null;
	function openDrawer() {
		if (!drawer) return;
		lastFocus = doc.activeElement;
		drawer.hidden = false;
		doc.body.classList.add('drawer-open');
		burger.setAttribute('aria-expanded', 'true');
		requestAnimationFrame(function () {
			requestAnimationFrame(function () {
				drawer.classList.add('is-open');
				var c = $('.drawer__close', drawer);
				if (c) c.focus();
			});
		});
	}
	function closeDrawer() {
		if (!drawer || drawer.hidden) return;
		drawer.classList.remove('is-open');
		doc.body.classList.remove('drawer-open');
		burger.setAttribute('aria-expanded', 'false');
		setTimeout(function () { drawer.hidden = true; }, 450);
		if (lastFocus) lastFocus.focus();
	}
	if (burger) burger.addEventListener('click', openDrawer);
	$$('[data-close]', drawer).forEach(function (el) { el.addEventListener('click', closeDrawer); });
	doc.addEventListener('keydown', function (e) {
		if (e.key === 'Escape') closeDrawer();
		if (e.key === 'Tab' && drawer && !drawer.hidden) {
			var f = $$('a, button', drawer).filter(function (el) { return el.offsetParent !== null; });
			if (!f.length) return;
			var first = f[0], last = f[f.length - 1];
			if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
			else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
		}
	});
	window.addEventListener('resize', function () { if (window.innerWidth > 1024) closeDrawer(); });

	/* ---------- Hero slider ---------- */
	var hero = $('#hero');
	if (hero) {
		var slides = $$('.slide', hero);
		var dots = $$('.hero__dot', hero);
		var countEl = $('.hero__count b', hero);
		var DUR = 6500;
		var idx = 0;
		var timer = null;
		var paused = false;
		hero.style.setProperty('--hero-dur', DUR + 'ms');

		var go = function (n) {
			n = (n + slides.length) % slides.length;
			if (n === idx) return;
			slides[idx].classList.remove('is-active');
			slides[idx].setAttribute('aria-hidden', 'true');
			$$('a', slides[idx]).forEach(function (a) { a.setAttribute('tabindex', '-1'); });
			dots[idx].classList.remove('is-active');
			dots[idx].setAttribute('aria-selected', 'false');
			idx = n;
			slides[idx].classList.add('is-active');
			slides[idx].removeAttribute('aria-hidden');
			$$('a', slides[idx]).forEach(function (a) { a.removeAttribute('tabindex'); });
			// restart progress animation
			var d = dots[idx];
			d.classList.remove('is-active');
			void d.offsetWidth;
			d.classList.add('is-active');
			d.setAttribute('aria-selected', 'true');
			if (countEl) countEl.textContent = ('0' + (idx + 1)).slice(-2);
			schedule();
		};
		var schedule = function () {
			clearTimeout(timer);
			if (paused || reduce || slides.length < 2) return;
			timer = setTimeout(function () { go(idx + 1); }, DUR);
		};
		var pause = function () { paused = true; hero.classList.add('is-paused'); clearTimeout(timer); };
		var resume = function () {
			paused = false; hero.classList.remove('is-paused');
			// restart current progress so it matches the timer
			var d = dots[idx]; d.classList.remove('is-active'); void d.offsetWidth; d.classList.add('is-active');
			schedule();
		};

		$('.hero__next', hero).addEventListener('click', function () { go(idx + 1); });
		$('.hero__prev', hero).addEventListener('click', function () { go(idx - 1); });
		dots.forEach(function (d, i) { d.addEventListener('click', function () { go(i); }); });

		var media = window.matchMedia('(hover: hover)');
		if (media.matches) {
			hero.addEventListener('mouseenter', pause);
			hero.addEventListener('mouseleave', resume);
		}
		hero.addEventListener('focusin', pause);
		hero.addEventListener('focusout', function (e) { if (!hero.contains(e.relatedTarget)) resume(); });
		doc.addEventListener('visibilitychange', function () { if (doc.hidden) pause(); else resume(); });
		hero.addEventListener('keydown', function (e) {
			if (e.key === 'ArrowRight') go(isRTL ? idx - 1 : idx + 1);
			if (e.key === 'ArrowLeft') go(isRTL ? idx + 1 : idx - 1);
		});

		// Swipe
		var sx = 0, sy = 0, swiping = false;
		hero.addEventListener('touchstart', function (e) {
			sx = e.touches[0].clientX; sy = e.touches[0].clientY; swiping = true;
		}, { passive: true });
		hero.addEventListener('touchend', function (e) {
			if (!swiping) return;
			swiping = false;
			var dx = e.changedTouches[0].clientX - sx;
			var dy = e.changedTouches[0].clientY - sy;
			if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
				var forward = dx < 0;
				if (isRTL) forward = !forward;
				go(forward ? idx + 1 : idx - 1);
			}
		}, { passive: true });

		// Tilt
		if (!reduce && media.matches) {
			$$('[data-tilt]', hero).forEach(function (card) {
				card.addEventListener('mousemove', function (e) {
					var r = card.getBoundingClientRect();
					var px = (e.clientX - r.left) / r.width - 0.5;
					var py = (e.clientY - r.top) / r.height - 0.5;
					card.style.setProperty('--ry', (px * 12).toFixed(2) + 'deg');
					card.style.setProperty('--rx', (-py * 12).toFixed(2) + 'deg');
				});
				card.addEventListener('mouseleave', function () {
					card.style.setProperty('--ry', '0deg');
					card.style.setProperty('--rx', '0deg');
				});
			});
		}

		// Snowflakes
		var flakes = $('.hero__flakes', hero);
		if (flakes && !reduce) {
			var n = window.innerWidth < 760 ? 12 : 26;
			for (var i = 0; i < n; i++) {
				var f = doc.createElement('span');
				var size = (Math.random() * 4 + 2).toFixed(1);
				f.className = 'flake';
				f.style.left = (Math.random() * 100).toFixed(2) + '%';
				f.style.width = f.style.height = size + 'px';
				f.style.opacity = (Math.random() * 0.5 + 0.3).toFixed(2);
				f.style.animationDuration = (Math.random() * 10 + 10).toFixed(1) + 's';
				f.style.animationDelay = (-Math.random() * 20).toFixed(1) + 's';
				f.style.setProperty('--sway', ((Math.random() - 0.5) * 120).toFixed(0) + 'px');
				flakes.appendChild(f);
			}
		}

		schedule();
	}

	/* ---------- Reveal on scroll ---------- */
	$$('[data-reveal-group]').forEach(function (g) {
		$$('[data-reveal]', g).forEach(function (el, i) {
			el.style.setProperty('--rd', (Math.min(i, 8) * 0.08).toFixed(2) + 's');
		});
	});
	var revealEls = $$('[data-reveal]');
	if ('IntersectionObserver' in window && !reduce) {
		var io = new IntersectionObserver(function (entries) {
			entries.forEach(function (en) {
				if (en.isIntersecting) {
					en.target.classList.add('is-in');
					io.unobserve(en.target);
				}
			});
		}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
		revealEls.forEach(function (el) { io.observe(el); });
	} else {
		revealEls.forEach(function (el) { el.classList.add('is-in'); });
	}

	/* ---------- Counters ---------- */
	var counters = $$('[data-count]');
	function runCounter(el) {
		var end = parseInt(el.getAttribute('data-count'), 10) || 0;
		if (reduce || end === 0) { el.textContent = end; return; }
		var start = null, dur = 1600;
		el.textContent = '0';
		function step(ts) {
			if (!start) start = ts;
			var p = Math.min((ts - start) / dur, 1);
			var eased = 1 - Math.pow(1 - p, 3);
			el.textContent = Math.round(end * eased);
			if (p < 1) requestAnimationFrame(step);
		}
		requestAnimationFrame(step);
	}
	if ('IntersectionObserver' in window) {
		var co = new IntersectionObserver(function (entries) {
			entries.forEach(function (en) {
				if (en.isIntersecting) { runCounter(en.target); co.unobserve(en.target); }
			});
		}, { threshold: 0.6 });
		counters.forEach(function (c) { co.observe(c); });
	}

	/* ---------- Product filter ---------- */
	var chips = $$('.filters .chip');
	if (chips.length) {
		var cards = $$('#products-grid .product-card');
		chips.forEach(function (chip) {
			chip.addEventListener('click', function () {
				var f = chip.getAttribute('data-filter');
				chips.forEach(function (c) {
					var on = c === chip;
					c.classList.toggle('is-active', on);
					c.setAttribute('aria-pressed', on ? 'true' : 'false');
				});
				cards.forEach(function (card) {
					var show = f === 'all' || card.getAttribute('data-brand') === f;
					card.classList.remove('is-shown');
					card.classList.toggle('is-hidden', !show);
					if (show) {
						card.classList.add('is-in');
						void card.offsetWidth;
						card.classList.add('is-shown');
					}
				});
			});
		});
	}

	/* ---------- Contact form ---------- */
	var form = $('.form');
	if (form) {
		var err = $('.form__error', form);
		var validate = function () {
			var ok = true;
			['name', 'phone'].forEach(function (n) {
				var input = form.elements[n];
				var bad = !input.value.trim();
				input.closest('.field').classList.toggle('has-error', bad);
				if (bad) ok = false;
			});
			if (err) { err.hidden = ok; err.textContent = ok ? '' : cfg.i18n.required; }
			return ok;
		};
		form.addEventListener('submit', function (e) {
			if (!validate()) e.preventDefault();
		});
		var waBtn = $('[data-wa-send]', form);
		if (waBtn) {
			waBtn.addEventListener('click', function () {
				if (!validate()) return;
				var el = form.elements;
				var msg = cfg.i18n.waHello + ':\n' +
					cfg.i18n.name + ': ' + el.name.value.trim() + '\n' +
					cfg.i18n.phone + ': ' + el.phone.value.trim() + '\n' +
					cfg.i18n.service + ': ' + el.service.value + '\n' +
					(el.message.value.trim() ? cfg.i18n.message + ': ' + el.message.value.trim() : '');
				window.open('https://wa.me/' + cfg.whatsapp + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');
			});
		}
	}
})();
