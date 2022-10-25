import {
  SpecCreated,
  Transfer as BadgeTransfer,
  RefreshMetadata,
  BadgeRevoked,
  BadgeReinstated,
} from '../generated/Badges/Badges';
import {
  Transfer as RaftTransfer,
  Raft as RaftContract,
  MetadataUpdate,
} from '../generated/Raft/Raft';
import { Badge, BadgeSpec, Raft } from '../generated/schema';
import {
  RaftMetadata as RaftMetadataTemplate,
  SpecMetadata as SpecMetadataTemplate,
} from '../generated/templates';
import { log, DataSourceContext } from '@graphprotocol/graph-ts';
import {
  getCIDFromIPFSUri,
  getBadgeID,
  getRaftID,
  appendMetadataPath,
  getFullMetadataPath,
  isValidCID,
  buildCIDPathFromRaftUri,
  getReasonString,
} from './utils/helper';
import { handleBadgeMinted, handleBadgeBurned } from './badges';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export function handleRaftTransfer(event: RaftTransfer): void {
  const to = event.params.to;
  const tokenId = event.params.tokenId;
  const raftID = getRaftID(tokenId, event.address);
  const timestamp = event.block.timestamp;

  let raft = Raft.load(raftID);
  if (raft !== null) {
    // Raft was transferred to a new owner
    raft.owner = to;
    raft.save();
  } else {
    const raftContract = RaftContract.bind(event.address);
    const tokenUri = raftContract.tokenURI(tokenId);

    raft = new Raft(raftID);
    raft.uri = tokenUri
    raft.owner = to;
    raft.tokenId = tokenId;
    raft.totalBadgesCount = 0;
    raft.totalSpecsCount = 0;
    raft.createdAt = timestamp.toI32();
    raft.createdBy = event.params.from.toHexString();

    raft.save();

    updateRaftMetadata(raftID);
  }
}

export function handleSpecCreated(event: SpecCreated): void {
  const cid = getCIDFromIPFSUri(event.params.specUri);
  const uri = getFullMetadataPath(cid);
  const raftAddress = event.params.raftAddress;
  const raftTokenId = event.params.raftTokenId;
  const raftID = getRaftID(raftTokenId, raftAddress);
  const timestamp = event.block.timestamp;
  const createdBy = event.params.to.toHexString();

  let spec = new BadgeSpec(cid);
  spec.uri = uri;
  spec.raft = raftID;
  spec.createdAt = timestamp.toI32();
  spec.totalBadgesCount = 0;
  spec.createdBy = createdBy;
  spec.save();

  updateBadgeSpecMetadata(cid);

  const raft = Raft.load(raftID);
  if (raft !== null) {
    raft.totalSpecsCount += 1;
    raft.save();
  } else {
    log.error('handleSpecCreated: Raft {} not found. Raft entity was not updated', [raftID]);
  }
}

export function handleRefreshSpecMetadata(event: RefreshMetadata): void {
  const cid = getCIDFromIPFSUri(event.params.specUri);
  updateBadgeSpecMetadata(cid);
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

// this runs when `setTokenUri` is called on the contract
export function handleRaftMetadataUpdate(event: MetadataUpdate): void {
  const tokenId = event.params.tokenId;
  const raftAddress = event.address;
  const raftID = getRaftID(tokenId, raftAddress);
  updateRaftMetadata(raftID);
}

function updateRaftMetadata(raftID: string): void {
  const raft = Raft.load(raftID);
  if (raft !== null) {
    const cidPath = buildCIDPathFromRaftUri(raft.uri);
    raft.metadata = cidPath;

    if (isValidCID(cidPath)) {
      let context = new DataSourceContext();
      context.setString('ipfsHash', cidPath);
      RaftMetadataTemplate.createWithContext(cidPath, context);
    } else {
      log.error('updateRaftMetadata: Invalid CID in {} for raftID {}', [raft.uri, raftID]);
    }

    raft.save();
  } else {
    log.error('updateRaftMetadata: Raft {} not found. RaftMetadata was not updated', [raftID]);
  }
}

function updateBadgeSpecMetadata(cid: string): void {
  const spec = BadgeSpec.load(cid);
  if (spec !== null) {
    const cidPath = appendMetadataPath(cid);
    spec.metadata = cidPath;

    if (isValidCID(cid)) {
    let context = new DataSourceContext();
    context.setString('ipfsHash', cidPath);
      SpecMetadataTemplate.createWithContext(cidPath, context);
    } else {
      log.error('updateBadgeSpecMetadata: Invalid CID {}', [cid]);
    }

    spec.save();
  } else {
    log.error('updateBadgeSpecMetadata: BadgeSpec {} not found. BadgeSpec entity was not updated', [
      cid,
    ]);
  }
}

export function handleBadgeRevoked(event: BadgeRevoked): void {
  const tokenId = event.params.tokenId;
  const badgeAddress = event.address;
  const badgeId = getBadgeID(tokenId, badgeAddress);
  const timestamp = event.block.timestamp;
  const reasonCode = event.params.reason;
  const reason = getReasonString(reasonCode);

  updateBadgeRevocationStatus('handleBadgeRevoked', badgeId, timestamp.toU32(), reason);
}

export function handleBadgeReinstated(event: BadgeReinstated): void {
  const tokenId = event.params.tokenId;
  const badgeAddress = event.address;
  const badgeId = getBadgeID(tokenId, badgeAddress);

  updateBadgeRevocationStatus('handleBadgeReinstated', badgeId, 0, '');
}

function updateBadgeRevocationStatus(
  context: string,
  badgeId: string,
  timestamp: number,
  reason: string,
) {
  const badge = Badge.load(badgeId);
  if (badge !== null) {
    // todo: not sure about storing it like this. Maybe we need a better way to store this
    // todo: still not capturing revokedBy
    badge.revokedAt = timestamp;
    badge.revokedReason = reason;
    badge.save();
  } else {
    log.error('{}: Badge {} not found. Badge entity was not updated with revocation details', [
      context,
      badgeId,
    ]);
  }
}
