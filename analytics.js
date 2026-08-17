// Empowered Vote — landing-site analytics (PostHog).
//
// SINGLE SOURCE OF TRUTH. Every page on this site loads this file with one line
// in its <head>, as early as possible:
//
//     <script src="/analytics.js"></script>
//
// That's the whole integration — there is nothing else to copy. This file used
// to be a ~55-line snippet pasted inline into each page, which is how the
// /maps/ pages and briefing/index.html ended up with no tracking at all, and
// how the surviving copies drifted apart. Keep it as one include.
//
// ev-landing is plain static HTML with no build step, so it can't consume the
// shared @empoweredvote/analytics npm package the React apps use. This file
// mirrors that package's behavior (defaults, environment inference, exception
// noise filtering) by hand — if you change the package, change this too.
//
// New page? Add the one-line include above. CI (.github/workflows/check-analytics.yml)
// will fail the build if you forget.

(function () {
    // ── posthog-js loader stub (from PostHog's install snippet) ───────────────
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog && window.posthog.__loaded)||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="Mi Ri init Vi Gi Rr Wi Ji Bi capture calculateEventProperties tn register register_once register_for_session unregister unregister_for_session an getFeatureFlag getFeatureFlagPayload getFeatureFlagResult isFeatureEnabled reloadFeatureFlags updateFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSurveysLoaded onSessionId getSurveys getActiveMatchingSurveys renderSurvey displaySurvey cancelPendingSurvey canRenderSurvey canRenderSurveyAsync un identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset setIdentity clearIdentity get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException addExceptionStep captureLog startExceptionAutocapture stopExceptionAutocapture loadToolbar get_property getSessionProperty nn Xi createPersonProfile setInternalOrTestUser sn Hi cn opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing get_explicit_consent_status is_capturing clear_opt_in_out_capturing Ki debug Lr rn getPageViewId captureTraceFeedback captureTraceMetric Di".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);

    // ── Error-tracking noise filter ──────────────────────────────────────────
    // Mirrors the shared errorTracking module used by the React apps. Drops
    // known-junk exceptions and de-duplicates identical exceptions within a
    // short window so a loop can't spike the PostHog ingestion bill. posthog-js
    // also has built-in per-client burst protection (token bucket, default
    // size 10 / refill 1); we keep it.
    var PH_EXCEPTION_NOISE = [
        /ResizeObserver loop (limit exceeded|completed with undelivered notifications)/i,
        /^Script error\.?$/i,
        /Non-Error promise rejection captured/i,
        /(Failed to fetch|NetworkError when attempting to fetch|Load failed|The operation was aborted|AbortError|The user aborted a request)/i,
        /(chrome|moz|safari|safari-web)-extension:\/\//i
    ];
    var PH_RECENT_EXCEPTIONS = new Map();
    var PH_DEDUP_WINDOW_MS = 5000;

    function phBeforeSend(event) {
        if (!event || event.event !== '$exception') return event;
        var list = (event.properties && event.properties['$exception_list']) || [];
        var first = list.length ? list[0] : {};
        var type = first['$exception_type'] || '';
        var message = first['$exception_message'] || '';
        var stack = first['$exception_stack_trace_raw'] || '';
        var haystack = type + ': ' + message + '\n' + (typeof stack === 'string' ? stack : JSON.stringify(stack));
        for (var i = 0; i < PH_EXCEPTION_NOISE.length; i++) {
            if (PH_EXCEPTION_NOISE[i].test(haystack)) return null;
        }
        var fingerprint = type + '|' + message;
        var now = Date.now();
        var last = PH_RECENT_EXCEPTIONS.get(fingerprint);
        if (last !== undefined && now - last < PH_DEDUP_WINDOW_MS) return null;
        PH_RECENT_EXCEPTIONS.set(fingerprint, now);
        return event;
    }

    // Environment inference — mirrors inferEnvironment() in @empoweredvote/analytics.
    function phEnvironment() {
        var host = window.location.hostname;
        if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) return 'development';
        if (host.endsWith('.onrender.com') || host.indexOf('preview') !== -1 || host.indexOf('-pr-') !== -1) return 'preview';
        return 'production';
    }

    posthog.init('phc_kpUWTjEcRRwSn7zdNstbDVYqAMQvEFZ5EgrWFeaAh5mu', {
        api_host: 'https://us.i.posthog.com',
        defaults: '2026-01-30',
        person_profiles: 'identified_only',
        // Exception autocapture (window.onerror + unhandledrejection) + filter.
        capture_exceptions: true,
        // Stitch anonymous journeys across *.empowered.vote (landing is the entry point).
        cross_subdomain_cookie: true,
        before_send: phBeforeSend,
    });
    // Stamp every event with app + environment so the shared PostHog project slices cleanly.
    posthog.register({ app: 'landing', environment: phEnvironment() });
})();
