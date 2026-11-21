import { describe, expect, it } from 'vitest';
import { unansweredAgeRating } from '../../scripts/age-rating.mjs';

// The rule behind asc-preflight's age-rating check. Apple adds questions over
// time; each arrives as null and 409s the review submission until answered.
describe('unansweredAgeRating', () => {
	it('flags a null question', () => {
		expect(unansweredAgeRating({ socialMedia: null, gambling: false })).toEqual(['socialMedia']);
	});

	it('ignores the fields that are null by design', () => {
		expect(
			unansweredAgeRating({
				kidsAgeBand: null,
				gracRatingClassificationNumber: null,
				developerAgeRatingInfoUrl: null
			})
		).toEqual([]);
	});

	it('needs no follow-up answer when the parent is false', () => {
		expect(unansweredAgeRating({ socialMedia: false, socialMediaAgeRestricted: null })).toEqual([]);
	});

	it('needs the follow-up when the parent is true or unanswered', () => {
		expect(unansweredAgeRating({ socialMedia: true, socialMediaAgeRestricted: null })).toEqual([
			'socialMediaAgeRestricted'
		]);
		expect(unansweredAgeRating({ socialMedia: null, socialMediaAgeRestricted: null })).toEqual([
			'socialMedia',
			'socialMediaAgeRestricted'
		]);
	});

	it('treats a missing declaration as nothing to report', () => {
		expect(unansweredAgeRating(null)).toEqual([]);
	});
});
