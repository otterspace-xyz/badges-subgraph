import { SpecCreated, Transfer as BadgeTransfer, RefreshMetadata } from '../generated/Badges/Badges';
import {
  Transfer as RaftTransfer,
  Raft as RaftContract,
  MetadataUpdate,
} from '../generated/Raft/Raft';
import { BadgeSpec, Raft, SpecMetadata, RaftMetadata } from '../generated/schema';
import {
  RaftMetadata as RaftMetadataTemplate, SpecMetadata as SpecMetadataTemplate
} from "../generated/templates";
import { log, json, JSONValue, JSONValueKind, Bytes, dataSource, DataSourceContext } from '@graphprotocol/graph-ts';
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
const excludedCids = ['invalid-cid'];

function checkCid(cid: string): boolean {
  return cid.length > 0 && !excludedCids.includes(cid)
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
    raft.createdAt = timestamp.toI32();
    raft.createdBy = event.params.from.toHexString();

    const raftContract = RaftContract.bind(event.address);
    raft.uri = raftContract.tokenURI(tokenId);

    const cid = getCIDFromIPFSUri(raft.uri);
    const cidPath = appendMetadataPath(cid);
    raft.metadata = cidPath;
    let context = new DataSourceContext()
    context.setString('ipfsHash', cidPath);
    log.warning('--> make metadata {}', [cidPath])
    if(checkCid(cid)) {
      log.warning('--> creating with context {}', [cidPath])
      RaftMetadataTemplate.createWithContext(cidPath, context);
    }
  }
  raft.save()
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

  const cidPath = appendMetadataPath(cid);
  spec.metadata = cidPath;
  let context = new DataSourceContext()
  log.warning('--> make metadata {}', [cidPath])
  context.setString('ipfsHash', cidPath);
  if(checkCid(cid)) {
    log.warning('--> creating with context {}', [cidPath])
    SpecMetadataTemplate.createWithContext(cidPath, context);
  }
  spec.save()

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
    const cidPath = appendMetadataPath(cid);
    raft.metadata = cidPath;
    log.warning('--> make metadata {}', [cidPath])
    let context = new DataSourceContext()
    context.setString('ipfsHash', cidPath);
    if(checkCid(cid)) {
      log.warning('--> creating with context {}', [cidPath])
      RaftMetadataTemplate.createWithContext(cidPath, context);
    }
    raft.save()
  }
}

export function handleRefreshMetadata(event: RefreshMetadata): void {
  const cid = getCIDFromIPFSUri(event.params.specUri);
  let spec = BadgeSpec.load(cid);
  if(spec){
    const cidPath = appendMetadataPath(cid);
    spec.metadata = cidPath;
    let context = new DataSourceContext()
    log.warning('--> make metadata {}', [cidPath])
    context.setString('ipfsHash', cidPath);
    if(checkCid(cid)) {
      log.warning('--> creating with context {}', [cidPath])
      SpecMetadataTemplate.createWithContext(cidPath, context);
    }
    spec.save()
  }
}
