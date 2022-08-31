import {
  Badges as BadgesContract,
  SpecCreated,
  Transfer as BadgeTransfer,
} from '../generated/Badges/Badges';
import { Transfer as RaftTransfer, Raft as RaftContract } from '../generated/Raft/Raft';
import { BadgeSpec, Badge, Raft } from '../generated/schema';
import { BigInt, Address, log } from '@graphprotocol/graph-ts';

const metadataPart = '/metadata.json';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const raftsUrnNamespace = 'rafts';
const badgesUrnNamespace = 'badges';

// returns a string representing the raftID in the format `rafts:raftAddress:raftTokenId`
function getRaftID(raftTokenId: BigInt, raftAddress: Address): string {
  return raftsUrnNamespace
    .concat(':')
    .concat(raftAddress.toHexString())
    .concat(':')
    .concat(raftTokenId.toString());
}

// returns a string that is a CID extracted from the IPFS uri
function getSpecID(uri: string): string {
  return uri.substring(uri.lastIndexOf('/') + 1);
}

// returns a string representing a unique badgeID in the format `badges:badgeAddress:badgeTokenId`
function getBadgeID(badgeTokenId: BigInt, badgeAddress: Address): string {
  return badgesUrnNamespace
    .concat(':')
    .concat(badgeAddress.toHexString())
    .concat(':')
    .concat(badgeTokenId.toString());
}

// returns a fully formed metadata uri for raft & badge metadata
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
    // Raft was transferred to a new owner
    raft.owner = to;
  } else {
    raft = new Raft(raftID);
    raft.owner = to;
    raft.tokenId = tokenId;
    raft.totalBadgesCount = 0;
    raft.totalSpecsCount = 0;
    raft.createdAtTimestamp = timestamp;

    const raftContract = RaftContract.bind(event.address);
    raft.uri = raftContract.tokenURI(tokenId);
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
    log.error('handleSpecCreated: Raft {} not found. Raft entity was not updated', [raftID]);
  }
}

export function handleBadgeTransfer(event: BadgeTransfer): void {
  const from = event.params.from.toHexString();
  const tokenId = event.params.tokenId;
  const badgeAddress = event.address;
  const badgeId = getBadgeID(tokenId, badgeAddress);
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

  const badgesContract = BadgesContract.bind(event.address);
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
      log.error(
        'handleBadgeMinted: RaftID {} not found. Raft entity was not updated with totalBadgesCount',
        [raftID],
      );
    }
  } else {
    log.error('handleBadgeMinted: Spec {} not found. Badge entity was not created', [specID]);
  }
}

function handleBadgeBurned(badgeId: string, event: BadgeTransfer): void {
  const timestamp = event.block.timestamp;

  const badge = Badge.load(badgeId);
  if (badge !== null) {
    badge.burnedAtTimestamp = timestamp;
    badge.save();
  } else {
    log.error(
      'handleBadgeBurned: Badge {} not found. Badge entity was not updated with burnedAtTimestamp',
      [badgeId],
    );
  }
}
