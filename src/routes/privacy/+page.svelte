<script lang="ts">
	// Privacy policy — required by App Review 5.1.1 (a URL in App Store Connect AND
	// an in-app link, from Settings). Prerendered (see +page.ts) so it reads without
	// JS. Written to match Chawan's actual data model: local-first, optional sync to
	// the user's OWN account, no analytics, no health data, no tracking.
	const updated = 'July 2026';
	const CONTACT = 'kornkranmarwin@gmail.com';
</script>

<svelte:head>
	<title>Chawan — Privacy Policy</title>
	<meta name="robots" content="index" />
</svelte:head>

<article class="policy">
	<h1>Chawan — Privacy Policy</h1>
	<p class="muted">Last updated: {updated}</p>

	<p>
		Chawan is a personal log for matcha sessions. It is built to be private by default: your data
		lives on your device, and — only if you choose to sign in — in your own private account. The
		developer of Chawan cannot see your data.
	</p>

	<h2>What Chawan stores, and where</h2>
	<ul>
		<li>
			<strong>Your sessions and tins</strong> (matcha brands, grades, amounts, ratings, prices,
			free-text notes, dates) and app <strong>settings</strong> are stored on your device.
		</li>
		<li>
			<strong>Tin photos</strong> stay on your device only. They are never uploaded and never leave the
			device through Chawan.
		</li>
		<li>
			<strong>Cloud sync (optional, off until you sign in):</strong> if you sign in, your sessions
			and tins are mirrored to your own <em>private</em> database so your devices stay in sync. Access
			is scoped to your account by row-level security; other users cannot read it, and the developer does
			not access it.
		</li>
	</ul>

	<h2>Account &amp; email</h2>
	<p>
		Signing in is optional and only needed for cross-device sync. It uses a one-time code sent to
		your email address (magic-link sign-in). Your email is used solely to send that code and to
		identify your account — never for marketing, advertising, or profiling. If you never sign in,
		Chawan collects no personal information at all.
	</p>

	<h2>Analytics &amp; tracking</h2>
	<p>
		Chawan contains no third-party analytics, advertising, or tracking SDKs. It does not collect a
		device identifier, does not track you across apps or websites, and does not profile you.
	</p>

	<h2>Sharing</h2>
	<p>
		Share cards you create are generated on your device as an image and handed to the system share
		sheet only when you choose to share. Chawan does not upload them or post anything on your
		behalf.
	</p>

	<h2>Your control &amp; data deletion</h2>
	<ul>
		<li>
			Delete any session or tin inside the app; deletions propagate to your other devices if you're
			signed in.
		</li>
		<li>Sign out at any time — this wipes Chawan's local copy of your data from that device.</li>
		<li>Export a full backup (JSON) of your sessions and tins from Settings whenever you like.</li>
		<li>
			To delete all of your synced account data, email us at the address below and we will remove
			it.
		</li>
	</ul>

	<h2>Children</h2>
	<p>
		Chawan is not directed to children and does not knowingly collect information from children.
	</p>

	<h2>Changes</h2>
	<p>
		If this policy changes, the “last updated” date above will change with it. Material changes will
		be reflected here before they take effect.
	</p>

	<h2>Contact</h2>
	<p>Questions or data-deletion requests: <a href="mailto:{CONTACT}">{CONTACT}</a>.</p>
</article>

<style>
	.policy {
		max-width: 46ch;
		margin: 0 auto;
		padding: 3rem 1.5rem 5rem;
		font-family:
			-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
		line-height: 1.6;
		color: #26221c;
	}
	h1 {
		font-size: 1.5rem;
		margin: 0 0 0.25rem;
	}
	h2 {
		font-size: 1rem;
		margin: 2rem 0 0.5rem;
	}
	.muted {
		color: #8c8273;
		font-size: 0.85rem;
		margin-top: 0;
	}
	ul {
		padding-left: 1.2rem;
	}
	li {
		margin: 0.35rem 0;
	}
	a {
		color: #3c7a51;
	}
	@media (prefers-color-scheme: dark) {
		.policy {
			color: #e9e0cf;
			background: #161b16;
		}
		.muted {
			color: #867d6f;
		}
		a {
			color: #67ac7d;
		}
	}
</style>
