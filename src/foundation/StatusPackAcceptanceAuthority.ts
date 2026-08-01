import type {WorkerEventRecord} from '../contracts/index.js';
import {compareRfc3339DateTimes} from './rfc3339DateTime.js';
import type {PackAcceptanceRecord, PackManifestRecord} from './statusPackTypes.js';

export class StatusPackAcceptanceAuthority {
    valid(manifest: PackManifestRecord, acceptance: PackAcceptanceRecord,
        events: readonly WorkerEventRecord[]): boolean {
        const packEvents = events.filter(event => event.laneId === manifest.authoredByLaneId &&
            event.payload.batch === manifest.packId);
        if (new Set(packEvents.map(event => event.eventId)).size !== packEvents.length) return false;
        const authors = packEvents.filter(event => event.payload.role === 'implementer' && event.type === 'handoff');
        const reviews = packEvents.filter(event => event.payload.role === 'reviewer' && event.type === 'accept' &&
            event.payload.session === acceptance.reviewSessionId && event.producer === acceptance.reviewerId);
        if (authors.length !== 1 || reviews.length !== 1) return false;
        const author = authors[0]; const review = reviews[0];
        if (!linkedReview(author, review, packEvents) || author.payload.session === review.payload.session ||
            author.producer === review.producer) return false;
        return acceptance.findings.every(finding => finding.severity !== 'critical' || finding.disposition === 'closed' ||
            validSupersedingReview(finding.acceptedReviewRef, author, review, events));
    }
}

function validSupersedingReview(reference: string | undefined, author: WorkerEventRecord,
    primary: WorkerEventRecord, events: readonly WorkerEventRecord[]): boolean {
    if (reference === undefined || reference === primary.eventId) return false;
    const matches = events.filter(event => event.eventId === reference);
    if (matches.length !== 1) return false;
    const review = matches[0];
    return review.laneId === author.laneId && review.payload.batch === author.payload.batch &&
        review.payload.role === 'reviewer' && review.type === 'accept' && review.payload.session !== primary.payload.session &&
        review.payload.session !== author.payload.session && review.producer !== author.producer &&
        linkedReview(author, review, events);
}

function linkedReview(author: WorkerEventRecord, review: WorkerEventRecord,
    orderedEvents: readonly WorkerEventRecord[]): boolean {
    const instantOrder = compareRfc3339DateTimes(review.at, author.at);
    return review.correlationId === author.correlationId && review.causationId === author.eventId &&
        review.policyVersion === author.policyVersion && review.sequence > author.sequence &&
        orderedEvents.indexOf(review) > orderedEvents.indexOf(author) && instantOrder !== undefined && instantOrder > 0;
}
