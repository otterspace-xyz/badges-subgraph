import { Badges, SpecCreated, Transfer as BadgeTransfer } from '../generated/Badges/Badges';
import { Transfer as RaftTransfer } from '../generated/Raft/Raft';
import { BadgeSpec, Badge, Raft } from '../generated/schema';
import { BigInt, Address, log } from '@graphprotocol/graph-ts';

const metadataPart = '/metadata.json';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

function getRaftID(raftTokenId: BigInt, raftAddress: Address): string {
  return raftAddress
    .toHexString()
    .concat(':')
    .concat(raftTokenId.toString());
}

function getSpecID(uri: string): string {
  return uri.substring(uri.lastIndexOf('/') + 1);
}

function getBadgeID(badgeTokenId: BigInt, badgeAddress: Address): string {
  return badgeAddress
  .toHexString()
  .concat(':')
  .concat(badgeTokenId.toString());
}

function getMetadataUri(uri: string): string {
  return uri.concat(metadataPart);
}

export function handleRaftTransfer(event: RaftTransfer): void {
  const to = event.params.to;
  const tokenId = event.params.tokenId;
  const raftID = getRaftID(tokenId, event.address);
  const timestamp = event.block.timestamp;

  let raft = Raft.load(raftID);
  if (raft !== null) {
    raft.owner = to;
  } else {
    raft = new Raft(raftID);
    raft.owner = to;
    raft.tokenId = tokenId;
    raft.totalBadgesCount = 0;
    raft.totalSpecsCount = 0;
    raft.createdAtTimestamp = timestamp;
  }
  raft.save();
}

export function handleSpecCreated(event: SpecCreated): void {
  const id = getSpecID(event.params.specUri);
  const uri = getMetadataUri(event.params.specUri);
  const raftAddress = event.params.raftAddress;
  const raftTokenId = event.params.raftTokenId;
  const raftID = getRaftID(raftTokenId, raftAddress);
  const timestamp = event.block.timestamp;

  let spec = new BadgeSpec(id);
  spec.uri = uri;
  spec.raft = raftID;
  spec.createdAtTimestamp = timestamp;
  spec.totalBadgesCount = 0;
  spec.save();

  const raft = Raft.load(raftID);
  if (raft !== null) {
    raft.totalSpecsCount += 1;
    raft.save();
  } else {
    log.critical('Raft not found: {raftID}', [raftID]);
  }
}

export function handleBadgeTransfer(event: BadgeTransfer): void {
  const from = event.params.from.toHexString();
  const tokenId = event.params.tokenId;
  const badgeAddress = event.address;
  const badgeId = getBadgeID(tokenId, badgeAddress)
  if (from == ZERO_ADDRESS) {
    handleBadgeMinted(badgeId, event);
  } else {
    handleBadgeBurned(badgeId, event);
  }
}

function handleBadgeMinted(badgeId: string, event: BadgeTransfer): void {
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

function handleBadgeBurned(badgeId: string, event: BadgeTransfer): void {
  const timestamp = event.block.timestamp;

  const badge = Badge.load(badgeId);
  if (badge !== null) {
    badge.burnedAtTimestamp = timestamp;
    badge.save();
  }
}
