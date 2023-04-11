import { Badges as BadgesContract, Transfer as BadgeTransfer } from '../../generated/Badges/Badges';
import { BadgeSpec, Badge, Raft, User } from '../../generated/schema';
import { Address, log } from '@graphprotocol/graph-ts';
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

  let raftID = '';

  // update spec entity
  const spec = BadgeSpec.load(specID);
  if (spec !== null) {
    spec.totalBadgesCount += 1;
    raftID = spec.raft;
    spec.save();
  } else {
    log.error('handleBadgeMinted: SpecID {} not found. Badge entity was not created', [specID]);
  }

  // update raft entity
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

  // update user entity
  const user = User.load(to);
  if (user !== null) {
    user.totalBadgesCount += 1;
    user.save();
  } else {
    log.error(
      'handleBadgeMinted: UserID {} not found. User entity was not updated with totalBadgesCount',
      [to.toHexString()],
    );
  }
}

export function handleBadgeBurned(to: Address): void {
  // update user entity
  const user = User.load(to);
  if (user !== null) {
    user.totalBadgesCount -= 1;
    user.save();
  } else {
    log.error(
      'handleBadgeBurned: UserID {} not found. User entity was not updated with totalBadgesCount',
      [to.toHexString()],
    );
  }
}
