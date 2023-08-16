import {
  SpecCreated,
  Transfer as BadgeTransfer,
  RefreshMetadata,
  MetadataUpdate as BadgeMetadataUpdate,
  BadgeRevoked,
  BadgeReinstated,
  Badges as BadgeContract,
  Badges,
} from '../generated/Badges/Badges';
import {
  Transfer as RaftTransfer,
  MetadataUpdate as RaftMetadataUpdate,
  Raft as RaftContract,
  AdminUpdate,
} from '../generated/Raft/Raft';
import { Badge, BadgeSpec, Raft, User } from '../generated/schema';
import {
  RaftMetadata as RaftMetadataTemplate,
  SpecMetadata as SpecMetadataTemplate,
} from '../generated/templates';
import { log, DataSourceContext, BigInt, Bytes, Address } from '@graphprotocol/graph-ts';
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
  const txnHash = event.transaction.hash.toHexString();

  createUser(event.params.to);

  let raft = Raft.load(raftID);
  if (raft !== null) {
    // Raft was transferred to a new owner
    raft.owner = to;
    raft.save();
  } else {
    const raftContract = RaftContract.bind(event.address);
    const tokenUri = raftContract.tokenURI(tokenId);

    raft = new Raft(raftID);
    raft.uri = tokenUri;
    raft.owner = to;
    raft.tokenId = tokenId;
    raft.totalBadgesCount = 0;
    raft.totalSpecsCount = 0;
    raft.totalBadgeHoldersCount = 0;
    raft.admins = new Array<Bytes>();
    raft.createdAt = timestamp.toI32();
    raft.createdBy = event.params.from.toHexString();
    raft.transactionHash = txnHash;

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
  const txnHash = event.transaction.hash.toHexString();

  let spec = new BadgeSpec(cid);
  spec.uri = uri; // this is the fully resolvable metadata uri
  spec.specUri = event.params.specUri; // this is the value that was used to registered spec
  spec.raft = raftID;
  spec.createdAt = timestamp.toI32();
  spec.totalBadgesCount = 0;
  spec.totalRevokedBadgesCount = 0;
  spec.createdBy = createdBy;
  spec.transactionHash = txnHash;
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
  for (let i = 0; i < event.params.specUris.length; i++) {
    const cid = getCIDFromIPFSUri(event.params.specUris[i]);
    updateBadgeSpecMetadata(cid);
  }
}

export function handleBadgeMetadataUpdated(event: BadgeMetadataUpdate): void {
  const badgeId = getBadgeID(event.params.tokenId, event.address);
  const badge = Badge.load(badgeId);
  if (badge == null) {
    log.error('handleMetadataUpdated: Badge {} not found', [badgeId]);
    return;
  }

  //notice: we unfortunately can't use the event's `newTokenURI`, since it's emitted as indexed value
  // https://docs.soliditylang.org/en/v0.8.21/abi-spec.html#encoding-of-indexed-event-parameters
  // https://ethereum.stackexchange.com/questions/6840/indexed-event-with-string-not-getting-logged
  const badgeContract = BadgeContract.bind(event.address);
  const newTokenUri = badgeContract.tokenURI(event.params.tokenId);

  const cid = getCIDFromIPFSUri(newTokenUri);
  if (cid == 'invalid-cid') {
    log.error('token uri {} didnt contain a valid cid', [newTokenUri]);
    return;
  }
  badge.tokenUriUpdatedAt = event.block.timestamp.toU32();
  badge.tokenUri = getFullMetadataPath(cid);
  badge.save();
}

export function handleBadgeTransfer(event: BadgeTransfer): void {
  const from = event.params.from.toHexString();
  const to = event.params.to.toHexString();
  const tokenId = event.params.tokenId;
  const badgeAddress = event.address;
  const badgeId = getBadgeID(tokenId, badgeAddress);
  const timestamp = event.block.timestamp;
  let status = '';
  let statusReason = '';
  let statusChangedBy = '';

  if (from == ZERO_ADDRESS) {
    handleBadgeMinted(badgeId, event);
    status = 'MINTED';
    statusReason = 'Badge minted by user';
    statusChangedBy = to;
  } else if (to == ZERO_ADDRESS) {
    handleBadgeBurned(event.params.to);
    status = 'BURNED';
    statusReason = 'Badge burned by user';
    statusChangedBy = from;
  } else {
    log.error('Invalid Badge Transfer event - from {}, to {}', [from, to]);
    return;
  }

  updateBadgeStatus(badgeId, timestamp, status, statusReason, statusChangedBy);
}

export function handleAdminUpdate(event: AdminUpdate): void {
  const tokenId = event.params.tokenId;
  const raftAddress = event.address;
  const raftID = getRaftID(tokenId, raftAddress);
  const adminAddress = event.params.admin;
  const isAdminActive = event.params.isAdded;
  const raft = Raft.load(raftID);

  createUser(adminAddress);

  if (raft !== null) {
    let admins = raft.admins;
    const index = raft.admins.indexOf(adminAddress);
    if (isAdminActive && index === -1) {
      admins.push(adminAddress);
    } else if (!isAdminActive && index > -1) {
      admins.splice(index, 1);
    }
    raft.admins = admins;
    raft.save();
  } else {
    log.error('handleAdminUpdate: Raft {} not found', [raftID]);
  }
}

function createUser(userAddress: Address): void {
  let user = User.load(userAddress);

  if (user === null) {
    user = new User(userAddress);
    user.totalBadgesCount = 0;
    user.save();
  }
}

// this runs when `setTokenUri` is called on the contract
export function handleRaftMetadataUpdate(event: RaftMetadataUpdate): void {
  const tokenId = event.params.tokenId;
  const raftAddress = event.address;
  const raftID = getRaftID(tokenId, raftAddress);
  const raftContract = RaftContract.bind(raftAddress);
  const tokenURI = raftContract.tokenURI(tokenId);
  const raft = Raft.load(raftID);

  if (raft !== null) {
    raft.uri = tokenURI;
    raft.save();
  } else {
    log.error('handleRaftMetadataUpdate: Raft {} not found. RaftMetadata was not updated', [
      raftID,
    ]);
  }

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
  const from = event.params.from.toHexString();
  const status = 'REVOKED';

  updateBadgeStatus(badgeId, timestamp, status, reason, from);

  const badgesContract = Badges.bind(badgeAddress);
  const specUri = badgesContract.tokenURI(tokenId);
  const specID = getCIDFromIPFSUri(specUri);

  // update spec entity
  const spec = BadgeSpec.load(specID);
  if (spec !== null) {
    spec.totalRevokedBadgesCount += 1;
    spec.save();
  } else {
    log.error('handleBadgeRevoked: SpecID {} not found. Spec entity was not updated', [specID]);
  }
}

export function handleBadgeReinstated(event: BadgeReinstated): void {
  const tokenId = event.params.tokenId;
  const badgeAddress = event.address;
  const badgeId = getBadgeID(tokenId, badgeAddress);
  const timestamp = event.block.timestamp;
  const reason = 'Reinstated by user';
  const from = event.params.from.toHexString();
  const status = 'REINSTATED';

  updateBadgeStatus(badgeId, timestamp, status, reason, from);

  const badgesContract = Badges.bind(badgeAddress);
  const specUri = badgesContract.tokenURI(tokenId);
  const specID = getCIDFromIPFSUri(specUri);

  // update spec entity
  const spec = BadgeSpec.load(specID);
  if (spec !== null) {
    spec.totalRevokedBadgesCount -= 1;
    spec.save();
  } else {
    log.error('handleBadgeReinstated: SpecID {} not found. Spec entity was not updated', [specID]);
  }
}

function updateBadgeStatus(
  badgeId: string,
  timestamp: BigInt,
  status: string,
  reason: string,
  byAddress: string,
): void {
  const badge = Badge.load(badgeId);
  if (badge !== null) {
    // todo: not sure about storing it like this. Maybe we need a better way to store this
    // todo: still not capturing revokedBy
    badge.status = status;
    badge.statusReason = reason;
    badge.statusUpdatedAt = timestamp.toU32();
    badge.statusUpdatedBy = byAddress;
    badge.save();
  } else {
    log.error('Badge {} not found. Badge entity was not updated with status details', [badgeId]);
  }
}
