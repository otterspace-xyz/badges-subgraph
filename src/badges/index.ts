import { Badges as BadgesContract, Transfer as BadgeTransfer } from '../../generated/Badges/Badges';
import { BadgeSpec, Badge, Raft, User } from '../../generated/schema';
import { Address, log } from '@graphprotocol/graph-ts';
import { getCIDFromIPFSUri } from '../utils/helper';

export function handleBadgeMinted(badgeId: string, event: BadgeTransfer): void {
  const tokenId = event.params.tokenId;
  const from = event.params.from;
  const to = event.params.to;
  const timestamp = event.block.timestamp;
  const txnHash = event.transaction.hash.toHexString();

  const badgesContract = BadgesContract.bind(event.address);
  const specUri = badgesContract.tokenURI(tokenId);
  const specID = getCIDFromIPFSUri(specUri);

  // create badge entity
  let badge = new Badge(badgeId);
  badge.from = from;
  badge.owner = to;
  badge.spec = specID;
  badge.createdAt = timestamp.toU32();
  badge.transactionHash = txnHash;
  badge.tokenUri = specUri;
  badge.save();

  let raftID = '';

  // update spec entity
  const spec = BadgeSpec.load(specID);
  if (spec !== null) {
    spec.totalBadgesCount += 1;
    spec.save();

    raftID = spec.raft;
  } else {
    log.error('handleBadgeMinted: SpecID {} not found. Badge entity was not created', [specID]);
    return
  }

  // update user entity
  let user = User.load(to);
  if (user !== null) {
    user.totalBadgesCount += 1;
  } else {
    user = new User(to);
    user.totalBadgesCount = 0;
    user.totalCommunitiesCount = 0;
  }
  user.save();

  // update raft entity
  const raft = Raft.load(raftID);
  if (raft !== null) {
    raft.totalBadgesCount += 1;

    let members = raft.members;
    const isUserAlreadyRaftMember = raft.members.includes(to);
    if (!isUserAlreadyRaftMember) {
      raft.totalMembersCount += 1;
      members.push(to);

      user.totalCommunitiesCount += 1;
      user.save();
    }
    raft.members = members;
    raft.save();
  } else {
    log.error(
      'handleBadgeMinted: RaftID {} not found. Raft entity was not updated with totalBadgesCount',
      [raftID],
    );
  }
}

export function handleBadgeBurned(badgeId: string, to: Address): void {
  const user = User.load(to);
  if (user !== null) {
    user.totalBadgesCount -= 1;
    user.save();
  } else {
    log.error(
      'handleBadgeBurned: UserID {} not found. User entity was not updated with totalBadgesCount',
      [to.toHexString()],
    );
    return
  }

  let specID = '';
  let raftID = '';
  const badge = Badge.load(badgeId);
  if (badge !== null) {
    specID = badge.spec;
  } else {
    log.error('handleBadgeBurned: BadgeID {} not found. Cannot proceed.', [badgeId]);
    return;
  }

  const spec = BadgeSpec.load(specID);
  if (spec !== null) {
    raftID = spec.raft;

    spec.totalBadgesCount -= 1;
    spec.save();
  } else {
    log.error('handleBadgeBurned: SpecID {} not found. Cannot proceed.', [specID]);
    return;
  }

  const raft = Raft.load(raftID);
  if (raft !== null) {
    raft.totalBadgesCount -= 1;

    let members = raft.members;
    const index = raft.members.indexOf(to);
    const doesUserHaveOtherBadgesFromRaft = spec.totalBadgesCount > 1;
    if (!doesUserHaveOtherBadgesFromRaft) {
      raft.totalMembersCount -= 1;
      members.splice(index, 1);

      user.totalCommunitiesCount -= 1;
      user.save();
    }
    raft.members = members;
    raft.save();
  } else {
    log.error('handleBadgeBurned: RaftID {} not found. Member was not checked for removal.', [
      raftID,
    ]);
  }
}
