import { SpecCreated, Transfer as BadgeTransfer } from '../generated/Badges/Badges';
import {
  Transfer as RaftTransfer,
  Raft as RaftContract,
  MetadataUpdate,
} from '../generated/Raft/Raft';
import { BadgeSpec, Raft } from '../generated/schema';
import { log, json, JSONValue, JSONValueKind } from '@graphprotocol/graph-ts';
import { ipfs } from '@graphprotocol/graph-ts';
import {
  getCIDFromIPFSUri,
  getBadgeID,
  getRaftID,
  appendMetadataPath,
  getFullMetadataPath,
  getIPFSMetadataBytes,
} from './utils/helper';
import { handleBadgeMinted, handleBadgeBurned } from './badges';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export function handleRaftTransfer(event: RaftTransfer): void {
  const to = event.params.to;
  const tokenId = event.params.tokenId;
  const raftID = getRaftID(tokenId, event.address);
  const timestamp = event.block.timestamp;

  let name = '';
  let description = '';
  let image = '';

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
    raft.createdAt = timestamp.toI32();
    raft.createdBy = event.params.from.toHexString();

    const raftContract = RaftContract.bind(event.address);
    raft.uri = raftContract.tokenURI(tokenId);

    const cid = getCIDFromIPFSUri(raft.uri);
    const metadataBytes = getIPFSMetadataBytes(cid);
    if (metadataBytes) {
      const result = json.try_fromBytes(metadataBytes);
      if (result.isOk) {
        name = (result.value.toObject().get('name') as JSONValue).toString();
        description = (result.value.toObject().get('description') as JSONValue).toString();
        image = (result.value.toObject().get('image') as JSONValue).toString();
      } else {
        log.error('handleRaftTransfer: error fetching metadata for {}', [cid]);
      }
    } else {
      log.error('handleRaftTransfer: Invalid IPFS for cid {} for raftID {}', [cid, raftID]);
    }

    raft.name = name;
    raft.description = description;
    raft.image = image;
  }

  raft.save();
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

  let name = '';
  let description = '';
  let image = '';
  let expiresAt: string | null = null;

  const cidPath = appendMetadataPath(cid);
  const metadataBytes = ipfs.cat(cidPath);
  if (metadataBytes) {
    const result = json.try_fromBytes(metadataBytes);
    if (result.isOk) {
      name = (result.value.toObject().get('name') as JSONValue).toString();
      description = (result.value.toObject().get('description') as JSONValue).toString();
      image = (result.value.toObject().get('image') as JSONValue).toString();

      const properties = result.value.toObject().get('properties');
      const expiresAtJsonValue =
        properties !== null ? properties.toObject().get('expiresAt') : null;

      expiresAt =
        expiresAtJsonValue !== null && expiresAtJsonValue.kind === JSONValueKind.STRING
          ? expiresAtJsonValue.toString()
          : null;
    } else {
      log.error('handleSpecCreated: error fetching metadata for {}', [cid]);
    }
  } else {
    log.error('handleSpecCreated: Invalid cid {}, path {} for {}', [cid, cidPath, uri]);
  }

  spec.name = name;
  spec.description = description;
  spec.image = image;
  spec.expiresAt = expiresAt;

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

export function handleMetadataUpdate(event: MetadataUpdate): void {
  const tokenId = event.params.tokenId;
  const raftAddress = event.address;
  const raftID = getRaftID(tokenId, raftAddress);
  const raft = Raft.load(raftID);

  if (raft !== null) {
    const raftContract = RaftContract.bind(event.address);
    raft.uri = raftContract.tokenURI(tokenId);

    const cid = getCIDFromIPFSUri(raft.uri);
    const metadataBytes = getIPFSMetadataBytes(cid);
    if (metadataBytes) {
      const result = json.try_fromBytes(metadataBytes);
      if (result.isOk) {
        raft.name = (result.value.toObject().get('name') as JSONValue).toString();
        raft.description = (result.value.toObject().get('description') as JSONValue).toString();
        raft.image = (result.value.toObject().get('image') as JSONValue).toString();
      } else {
        log.error('handleSetTokenURI: error fetching the metadata for {}', [cid]);
      }
    } else {
      log.error('handleSetTokenURI: Invalid IPFS for cid {} for raftID {}', [cid, raftID]);
    }
    raft.save();
  } else {
    log.error('handleSetTokenURI: Raft {} not found. Raft entity was not updated', [raftID]);
  }
}
