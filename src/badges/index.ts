import { log } from '@graphprotocol/graph-ts';
import { Badges, Transfer as BadgeTransfer } from '../../generated/Badges/Badges';
import { Badge, BadgeSpec, Raft } from '../../generated/schema';
import { getSpecID } from '../utils/helper';

export function handleBadgeMinted(badgeId: string, event: BadgeTransfer): void {
    const tokenId = event.params.tokenId;
    const from = event.params.from;
    const to = event.params.to;
    const timestamp = event.block.timestamp;

    const badgesContract = Badges.bind(event.address);
    const specUri = badgesContract.tokenURI(tokenId);
    const specID = getSpecID(specUri);

    let badge = new Badge(badgeId);
    badge.from = from;
    badge.owner = to;
    badge.spec = specID;
    badge.createdAtTimestamp = timestamp;
    badge.save();

    const spec = BadgeSpec.load(specID);
    if (spec !== null) {
        spec.totalBadgesCount += 1;
        spec.save();

        const raftID = spec.raft;
        const raft = Raft.load(raftID);
        if (raft !== null) {
            raft.totalBadgesCount += 1;
            raft.save();
        } else {
            log.critical('Raft not found: {raftID}', [raftID]);
        }
    } else {
        log.critical('Spec not found: {specID}', [specID]);
    }
}

export function handleBadgeBurned(badgeId: string, event: BadgeTransfer): void {
    const timestamp = event.block.timestamp;

    const badge = Badge.load(badgeId);
    if (badge !== null) {
        badge.burnedAtTimestamp = timestamp;
        badge.save();
    }
}