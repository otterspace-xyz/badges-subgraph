import { Badges as BadgesContract, Transfer as BadgeTransfer } from '../../generated/Badges/Badges';
import { BadgeSpec, Badge, Raft } from '../../generated/schema';
import { log } from '@graphprotocol/graph-ts';
import { getCIDFromIPFSUri } from '../utils/helper';

export function handleBadgeMinted(badgeId: string, event: BadgeTransfer): void {
  const tokenId = event.params.tokenId;
  const from = event.params.from;
  const to = event.params.to;
  const timestamp = event.block.timestamp;

  const badgesContract = BadgesContract.bind(event.address);
  const specUri = badgesContract.tokenURI(tokenId);
  const specID = getCIDFromIPFSUri(specUri);

  let badge = new Badge(badgeId);
  badge.from = from;
  badge.owner = to;
  badge.spec = specID;
  badge.createdAt = timestamp.toU32();
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
      log.error(
        'handleBadgeMinted: RaftID {} not found. Raft entity was not updated with totalBadgesCount',
        [raftID],
      );
    }
  } else {
    log.error('handleBadgeMinted: Spec {} not found. Badge entity was not created', [specID]);
  }
}
export function handleBadgeBurned(badgeId: string, event: BadgeTransfer): void {
  const timestamp = event.block.timestamp;

  const badge = Badge.load(badgeId);
  if (badge !== null) {
    badge.burnedAt = timestamp.toU32();
    badge.save();
  } else {
    log.error(
      'handleBadgeBurned: Badge {} not found. Badge entity was not updated with burnedAtTimestamp',
      [badgeId],
    );
  }
}
