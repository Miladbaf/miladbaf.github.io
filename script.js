/* ==========================================================================
   Milad Bafarassat — site behavior
   Theme · mobile nav · active-section tracking · scroll reveal ·
   Fig. 1: learned beam steering (neural policy → 8-element ULA)
   ========================================================================== */

(function () {
    'use strict';

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- Theme toggle ---------- */

    var themeToggle = document.getElementById('themeToggle');

    if (themeToggle) {
        themeToggle.addEventListener('click', function () {
            var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            try { localStorage.setItem('theme', next); } catch (e) {}
        });
    }

    /* ---------- Mobile navigation ---------- */

    var navToggle = document.getElementById('navToggle');
    var mobileNav = document.getElementById('mobileNav');

    function closeMobileNav() {
        if (!mobileNav || !mobileNav.classList.contains('open')) return;
        mobileNav.classList.remove('open');
        navToggle.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.setAttribute('aria-label', 'Open menu');
        document.body.classList.remove('nav-open');
        window.setTimeout(function () { mobileNav.hidden = true; }, 260);
    }

    function openMobileNav() {
        mobileNav.hidden = false;
        window.requestAnimationFrame(function () {
            window.requestAnimationFrame(function () {
                mobileNav.classList.add('open');
            });
        });
        navToggle.classList.add('open');
        navToggle.setAttribute('aria-expanded', 'true');
        navToggle.setAttribute('aria-label', 'Close menu');
        document.body.classList.add('nav-open');
    }

    if (navToggle && mobileNav) {
        navToggle.addEventListener('click', function () {
            if (mobileNav.classList.contains('open')) closeMobileNav();
            else openMobileNav();
        });

        mobileNav.querySelectorAll('.mobile-link').forEach(function (link) {
            link.addEventListener('click', closeMobileNav);
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeMobileNav();
        });
    }

    /* ---------- Active section in nav ---------- */

    var navLinks = document.querySelectorAll('.site-nav .nav-link');
    var sections = document.querySelectorAll('section[id]');

    if ('IntersectionObserver' in window && navLinks.length) {
        var byId = {};
        navLinks.forEach(function (link) {
            byId[link.getAttribute('href').slice(1)] = link;
        });

        var activeObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                navLinks.forEach(function (l) { l.classList.remove('active'); });
                var link = byId[entry.target.id];
                if (link) link.classList.add('active');
            });
        }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });

        sections.forEach(function (s) { activeObserver.observe(s); });
    }

    /* ---------- Scroll reveal ---------- */

    var revealTargets = document.querySelectorAll(
        '.hero-copy, .hero-figure, .section-head, .about-text, .about-facts, ' +
        '.news-row, .entry, .pub, .edu-item, .skill-group, .contact-block'
    );

    revealTargets.forEach(function (el) { el.classList.add('reveal'); });

    if (reduceMotion || !('IntersectionObserver' in window)) {
        revealTargets.forEach(function (el) { el.classList.add('in'); });
    } else {
        var revealObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                var el = entry.target;
                var siblings = Array.prototype.filter.call(
                    el.parentElement.children,
                    function (c) { return c.classList.contains('reveal'); }
                );
                var idx = siblings.indexOf(el);
                el.style.transitionDelay = Math.min(idx * 60, 300) + 'ms';
                el.classList.add('in');
                revealObserver.unobserve(el);
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

        revealTargets.forEach(function (el) { revealObserver.observe(el); });
    }

    /* ---------- Back to top ---------- */

    var backToTop = document.getElementById('backToTop');

    if (backToTop) {
        var onScroll = function () {
            backToTop.classList.toggle('visible', window.scrollY > 600);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();

        backToTop.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
        });
    }

    /* ---------- Fig. 1 — the agentic loop ----------
       observe → reason → act, closed over the air interface.
       The agent takes a link measurement back along the feedback path,
       runs its policy core (with a memory read and a tool call), and
       emits a steering command θ₀; the array factor of an N-element
       uniform linear array (d = λ/2) slews its main lobe to match:
       AF(θ) = | sin(N·ψ/2) / (N·sin(ψ/2)) |,  ψ = π·(cos θ − cos θ₀)   */

    var svg = document.getElementById('beamPlot');
    var beamPath = document.getElementById('beamPath');
    var beamMarker = document.getElementById('beamMarker');
    var readout = document.getElementById('steerReadout');
    var status = document.getElementById('loopStatus');
    var nnGroup = document.getElementById('nnGroup');
    var agentBox = document.getElementById('agentBox');
    var satMem = document.getElementById('satMem');
    var satTools = document.getElementById('satTools');
    var cmdGroup = document.getElementById('cmdGroup');
    var fbGroup = document.getElementById('fbGroup');
    var fbPath = document.getElementById('fbPath');
    var heroFigure = document.getElementById('heroFigure');

    if (svg && beamPath && beamMarker && readout && status && nnGroup) {
        var N = 8;
        var CX = 398, CY = 190, RMAX = 140;
        var FLOOR = -30;
        var NS = 'http://www.w3.org/2000/svg';

        /* --- the array --- */

        function arrayFactor(thetaDeg, steerDeg) {
            var t = thetaDeg * Math.PI / 180;
            var t0 = steerDeg * Math.PI / 180;
            var psi = Math.PI * (Math.cos(t) - Math.cos(t0));
            var s = Math.sin(psi / 2);
            if (Math.abs(s) < 1e-9) return 1;
            return Math.abs(Math.sin(N * psi / 2) / (N * s));
        }

        function radius(af) {
            var db = 20 * Math.log10(Math.max(af, 1e-6));
            if (db < FLOOR) db = FLOOR;
            return RMAX * (1 - db / FLOOR);
        }

        function point(thetaDeg, r) {
            var t = thetaDeg * Math.PI / 180;
            return [
                (CX + r * Math.cos(t)).toFixed(1),
                (CY - r * Math.sin(t)).toFixed(1)
            ];
        }

        function fmt(deg) {
            return deg.toFixed(1).padStart(5, '0');
        }

        function draw(steerDeg) {
            var d = '';
            for (var a = 0; a <= 360; a += 2) {
                var p = point(a, radius(arrayFactor(a, steerDeg)));
                d += (a === 0 ? 'M' : 'L') + p[0] + ' ' + p[1];
            }
            beamPath.setAttribute('d', d + 'Z');

            var peak = point(steerDeg, RMAX);
            beamMarker.setAttribute('cx', peak[0]);
            beamMarker.setAttribute('cy', peak[1]);
            beamMarker.setAttribute('opacity', '1');
        }

        /* --- the policy core (3 → 3 → 1) --- */

        var layers = [
            { x: 66,  ys: [134, 190, 246] },
            { x: 112, ys: [134, 190, 246] },
            { x: 158, ys: [190] }
        ];

        function el(tag, attrs, cls) {
            var e = document.createElementNS(NS, tag);
            for (var k in attrs) e.setAttribute(k, attrs[k]);
            if (cls) e.setAttribute('class', cls);
            return e;
        }

        var edgeGroups = [];
        var nodeLayers = [];

        layers.forEach(function (layer, li) {
            if (li < layers.length - 1) {
                var g = el('g', {}, 'nn-edges');
                var next = layers[li + 1];
                layer.ys.forEach(function (y1) {
                    next.ys.forEach(function (y2) {
                        g.appendChild(el('line', { x1: layer.x, y1: y1, x2: next.x, y2: y2 }));
                    });
                });
                nnGroup.appendChild(g);
                edgeGroups.push(g);
            }
        });

        layers.forEach(function (layer, li) {
            var isOut = li === layers.length - 1;
            var nodes = layer.ys.map(function (y) {
                var c = el('circle', { cx: layer.x, cy: y, r: isOut ? 5 : 4 },
                    'nn-node' + (isOut ? ' nn-out' : ''));
                nnGroup.appendChild(c);
                return c;
            });
            nodeLayers.push(nodes);
        });

        var outNode = nodeLayers[layers.length - 1][0];

        function setStage(s) {
            edgeGroups.forEach(function (g, i) {
                g.classList.toggle('on', i === s);
            });
            nodeLayers.forEach(function (nodes, l) {
                var lit = s >= 0 && (l === s || l === s + 1);
                nodes.forEach(function (n) { n.classList.toggle('on', lit); });
            });
        }

        function setStatus(step, word) {
            status.textContent = 't = ' + String(step).padStart(2, '0') + ' · ' + word;
        }

        /* --- the loop: observe → reason → act → dwell --- */

        if (reduceMotion) {
            draw(47);
            readout.textContent = 'θ₀ = ' + fmt(47) + '°';
            setStatus(1, 'act');
        } else {
            var current = 47;
            var target = 47;
            var phase = 'observe';
            var t0 = 0;
            var stepCount = 0;
            var reasonIdx = -1;
            var dwellUntil = 0;
            var running = false;
            var rafId = null;

            var OBS_MS = 650;

            // the reasoning sub-timeline: core pass, memory read,
            // tool call, second core pass, then the command fires
            var REASON = [
                { t: 0,    run: function () { setStage(0); } },
                { t: 260,  run: function () { setStage(-1); satMem.classList.add('on'); } },
                { t: 500,  run: function () { satMem.classList.remove('on'); satTools.classList.add('on'); } },
                { t: 740,  run: function () { satTools.classList.remove('on'); setStage(1); } },
                { t: 1000, run: function () {
                    setStage(-1);
                    outNode.classList.add('fire');
                    cmdGroup.classList.add('fire');
                    target = 25 + Math.random() * 130;      // the decision
                    readout.textContent = 'θ₀ = ' + fmt(target) + '°';
                    setStatus(stepCount, 'act');
                } },
                { t: 1340, run: function () {
                    outNode.classList.remove('fire');
                    cmdGroup.classList.remove('fire');
                    agentBox.classList.remove('on');
                    phase = 'track';
                } }
            ];

            function enterObserve(now) {
                phase = 'observe';
                t0 = now;
                stepCount += 1;
                fbGroup.classList.add('on');
                setStatus(stepCount, 'observe');
            }

            function enterReason(now) {
                phase = 'reason';
                t0 = now;
                reasonIdx = -1;
                fbGroup.classList.remove('on');
                fbPath.setAttribute('stroke-dashoffset', '0');
                agentBox.classList.add('on');
                setStatus(stepCount, 'reason');
            }

            draw(current);
            readout.textContent = 'θ₀ = ' + fmt(current) + '°';

            var lastNow = 0;

            var tick = function (now) {
                if (!running) return;

                // a long frame gap (tab wake, slow device) mid-step would
                // fast-forward the choreography invisibly — replay instead
                if (lastNow && now - lastNow > 800 && (phase === 'observe' || phase === 'reason')) {
                    resetTransients();
                    phase = 'observe';
                    t0 = 0;
                    if (stepCount > 0) stepCount -= 1;
                }
                lastNow = now;

                if (phase === 'observe') {
                    if (!t0) enterObserve(now);
                    var oel = now - t0;
                    // dashes flow from the array back into the agent
                    fbPath.setAttribute('stroke-dashoffset', String(-(oel * 0.055).toFixed(1)));
                    if (oel >= OBS_MS) enterReason(now);
                } else if (phase === 'reason') {
                    var rel = now - t0;
                    var next = reasonIdx + 1;
                    while (next < REASON.length && rel >= REASON[next].t) {
                        REASON[next].run();
                        reasonIdx = next;
                        next += 1;
                    }
                } else if (phase === 'track') {
                    var diff = target - current;
                    if (Math.abs(diff) < 0.3) {
                        current = target;
                        phase = 'dwell';
                        dwellUntil = now + 900 + Math.random() * 1500;
                    } else {
                        current += diff * 0.045;
                    }
                } else if (phase === 'dwell' && now >= dwellUntil) {
                    phase = 'observe';
                    t0 = 0;
                }

                draw(current);
                rafId = window.requestAnimationFrame(tick);
            };

            var resetTransients = function () {
                setStage(-1);
                satMem.classList.remove('on');
                satTools.classList.remove('on');
                outNode.classList.remove('fire');
                cmdGroup.classList.remove('fire');
                agentBox.classList.remove('on');
                fbGroup.classList.remove('on');
            };

            var setRunning = function (on) {
                if (on === running) return;
                running = on;
                if (on) {
                    if (phase === 'observe' || phase === 'reason') {
                        resetTransients();
                        phase = 'observe';
                        t0 = 0;
                        if (stepCount > 0) stepCount -= 1;  // re-run the interrupted step
                    }
                    lastNow = 0;
                    rafId = window.requestAnimationFrame(tick);
                } else if (rafId) {
                    window.cancelAnimationFrame(rafId);
                }
            };

            // animate only while the figure is on screen and the tab is visible
            if ('IntersectionObserver' in window && heroFigure) {
                var figVisible = true;
                var beamObserver = new IntersectionObserver(function (entries) {
                    figVisible = entries[0].isIntersecting;
                    setRunning(figVisible && !document.hidden);
                }, { threshold: 0.05 });
                beamObserver.observe(heroFigure);

                document.addEventListener('visibilitychange', function () {
                    setRunning(figVisible && !document.hidden);
                });
            } else {
                setRunning(true);
            }
        }
    }

    /* ---------- Hello ---------- */

    console.log('%cθ₀ locked. Thanks for stopping by — milad.bafarassat@gmail.com',
        'font-family: monospace; color: #0e7268;');
})();
