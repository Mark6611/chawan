<script lang="ts">
	// Privacy policy — required by App Review 5.1.1 (a URL in App Store Connect AND
	// an in-app link, from Settings). Prerendered (see +page.ts) so it reads without
	// JS. Written to match Chawan's actual data model: LOCAL-ONLY (no accounts, no
	// sync, nothing collected), no analytics, no health data, no tracking.
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
		Chawan is a personal log for matcha sessions. It is private by design: everything you record
		stays on your device. Chawan has no accounts, no sign-in, and no servers of its own — the
		developer cannot see your data because it never leaves your device.
	</p>

	<h2>What Chawan stores, and where</h2>
	<ul>
		<li>
			<strong>Your sessions and tins</strong> (matcha brands, grades, amounts, ratings, prices,
			free-text notes, dates) and app <strong>settings</strong> are stored on your device only.
		</li>
		<li>
			<strong>Tin photos</strong> stay on your device only. They are never uploaded and never leave the
			device through Chawan.
		</li>
	</ul>

	<h2>No accounts, nothing collected</h2>
	<p>
		Chawan does not offer account creation and does not collect, transmit, or store any personal
		information — no email address, no identifiers, nothing. There is no data about you for the
		developer to hold, sell, or lose.
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
		<li>Delete any session, or archive any tin, inside the app at any time.</li>
		<li>Export a full backup (JSON) of your sessions and tins from Settings whenever you like.</li>
		<li>
			Deleting the app deletes your data with it — nothing remains anywhere else, because nothing
			was ever sent anywhere else.
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
		/* Bottom clearance for the floating LinkRail: 52px bar + 8px lift +
		   safe-area inset ≈ 94px on a home-indicator iPhone. The old 5rem (80px)
		   cleared the previous full-bleed bar by 4px and no longer does — it was
		   cutting the contact address in half, which is the line an App Review
		   reviewer scrolls to. Every other page uses pb-28; this matches it and
		   adds the inset, since chawan has no body-level safe-area padding. */
		padding: 3rem 1.5rem calc(env(safe-area-inset-bottom, 0px) + 7rem);
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
