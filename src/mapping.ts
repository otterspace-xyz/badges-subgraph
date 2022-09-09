import { SpecCreated, Transfer as BadgeTransfer } from '../generated/Badges/Badges';
import { Transfer as RaftTransfer } from '../generated/Raft/Raft';
import { BadgeSpec, Raft } from '../generated/schema';
import { log } from '@graphprotocol/graph-ts';
import { getTokenID, getSpecID, getMetadataUri } from './utils/helper';
import { handleBadgeMinted, handleBadgeBurned } from './badges';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export function handleRaftTransfer(event: RaftTransfer): void {
  const to = event.params.to;
  const tokenId = event.params.tokenId;
  const raftID = getTokenID(tokenId, event.address);
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
  const raftID = getTokenID(raftTokenId, raftAddress);
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
  const badgeId = getTokenID(tokenId, badgeAddress)
  if (from == ZERO_ADDRESS) {
    handleBadgeMinted(badgeId, event);
  } else {
    handleBadgeBurned(badgeId, event);
  }
}
