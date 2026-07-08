#!/usr/bin/env bash
# Ship Chawan to TestFlight — one command, every gate checked.
#
#   scripts/ship.sh [build-number] [--dry-run]
#
# No build number → current CURRENT_PROJECT_VERSION + 1.
# --dry-run builds + signs the IPA but does NOT upload, and restores the pbxproj
# version bump (mutates nothing, consumes no build number). Run it first to prove
# signing works headlessly before a real ship.
#
# Adapted from Buffy's scripts/ship.sh, but SIMPLER: Chawan has no special
# entitlements (no App Groups / HealthKit / CloudKit), so automatic signing archives
# headlessly and there is no entitlement-verification step. The App Store Connect API
# key is account-level, so this reuses the same key Buffy uses — no new key needed.
#
# Gates are never piped (a piped `test | tail` reads tail's exit code and can ship a
# red build). Commit feature work BEFORE running — on success only the build-number
# bump is committed.
set -euo pipefail
cd "$(dirname "$0")/.."

PBXPROJ=ios/App/App.xcodeproj/project.pbxproj
# Restore the version bump on any early exit (failure or dry-run); cleared once the
# build is safely uploaded, after which the bump is committed instead.
RESTORE_PBXPROJ=1
cleanup() { [ "$RESTORE_PBXPROJ" = "1" ] && git checkout -- "$PBXPROJ" 2>/dev/null || true; }
trap cleanup EXIT

# ── App Store Connect API key (account-level — same key Buffy ships with) ──
ASC_KEY_ID="DUPV266J6S"
ASC_ISSUER="b0021702-5324-4cc1-9ddd-66a5a1535fe6"
ASC_KEY_PATH="$HOME/.appstoreconnect/private_keys/AuthKey_${ASC_KEY_ID}.p8"
TEAM_ID="ZCS5Y23P62"
APP_ID="6788678149"                       # App Store Connect app id for "Chawan by KK"
ARCHIVE=/tmp/chawan-archive/Chawan.xcarchive
EXPORT=/tmp/chawan-export

DRY_RUN=0
BUILD_NUM=""
for arg in "$@"; do
	case "$arg" in
		--dry-run) DRY_RUN=1 ;;
		*) BUILD_NUM="$arg" ;;
	esac
done

[ -f "$ASC_KEY_PATH" ] || { echo "FATAL: ASC API key missing at $ASC_KEY_PATH"; exit 1; }

# Advisory: shipping commits ONLY the version bump. Warn if other work is uncommitted.
if [ -n "$(git status --porcelain -- . ":!$PBXPROJ" 2>/dev/null)" ]; then
	echo "── note: uncommitted changes besides the version bump — commit feature work first if it should ship."
fi

echo "══ Gate 1/3: unit tests"
npm test
echo "══ Gate 2/3: type-check"
npm run check
echo "══ Gate 3/3: lint + format"
npm run lint

echo "══ Version bump"
CUR=$(grep -m1 'CURRENT_PROJECT_VERSION = ' "$PBXPROJ" | sed 's/[^0-9]//g')
BUILD_NUM=${BUILD_NUM:-$((CUR + 1))}
sed -i '' "s/CURRENT_PROJECT_VERSION = [0-9]*;/CURRENT_PROJECT_VERSION = ${BUILD_NUM};/g" "$PBXPROJ"
echo "   building 1.0 (${BUILD_NUM})"

echo "══ Web bundle + native sync"
npm run native:build > /tmp/chawan-iossync.log 2>&1 || { tail -30 /tmp/chawan-iossync.log; exit 1; }

echo "══ Signed archive (automatic signing via ASC key)"
rm -rf "$(dirname "$ARCHIVE")" "$EXPORT"
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release \
	-destination 'generic/platform=iOS' -archivePath "$ARCHIVE" \
	-allowProvisioningUpdates \
	-authenticationKeyPath "$ASC_KEY_PATH" \
	-authenticationKeyID "$ASC_KEY_ID" \
	-authenticationKeyIssuerID "$ASC_ISSUER" \
	archive > /tmp/chawan-archive.log 2>&1 || { tail -40 /tmp/chawan-archive.log; exit 1; }

echo "══ Export"
xcodebuild -exportArchive -archivePath "$ARCHIVE" -exportPath "$EXPORT" \
	-exportOptionsPlist ios/ExportOptions.plist \
	-allowProvisioningUpdates \
	-authenticationKeyPath "$ASC_KEY_PATH" \
	-authenticationKeyID "$ASC_KEY_ID" \
	-authenticationKeyIssuerID "$ASC_ISSUER" \
	> /tmp/chawan-export.log 2>&1 || { tail -40 /tmp/chawan-export.log; exit 1; }

echo "══ Sanity: IPA build number"
rm -rf /tmp/chawan-ipa && mkdir /tmp/chawan-ipa
unzip -q "$EXPORT/App.ipa" -d /tmp/chawan-ipa
VERS=$(/usr/libexec/PlistBuddy -c "Print :CFBundleVersion" /tmp/chawan-ipa/Payload/App.app/Info.plist)
[ "$VERS" = "$BUILD_NUM" ] || { echo "FATAL: IPA says build $VERS, expected $BUILD_NUM"; exit 1; }
echo "   IPA build $VERS OK"

if [ "$DRY_RUN" = "1" ]; then
	echo "── dry run: built + signed but NOT uploaded. IPA at $EXPORT/App.ipa (build $BUILD_NUM). Restoring pbxproj (no bump kept)."
	exit 0  # the EXIT trap restores project.pbxproj — a dry run mutates nothing
fi

echo "══ Upload to TestFlight"
xcrun altool --upload-app -f "$EXPORT/App.ipa" --type ios \
	--apiKey "$ASC_KEY_ID" --apiIssuer "$ASC_ISSUER" > /tmp/chawan-upload.log 2>&1 \
	|| { tail -20 /tmp/chawan-upload.log; exit 1; }
grep -q "UPLOAD SUCCEEDED" /tmp/chawan-upload.log || { tail -20 /tmp/chawan-upload.log; exit 1; }
echo "   UPLOAD SUCCEEDED — build $BUILD_NUM is processing on Apple's side (~10-15 min)."

# Keep + commit the version bump (feature work should already be committed).
RESTORE_PBXPROJ=0
git add "$PBXPROJ"
git commit -q -m "iOS: bump build to $BUILD_NUM for TestFlight" || true

echo "══ Done."
echo "   First ship only: App Store Connect → Chawan by KK → TestFlight → add yourself"
echo "   to Internal Testing so the build reaches your device once it finishes processing."
