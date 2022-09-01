import {
  Badges as BadgesContract,
  SpecCreated,
  Transfer as BadgeTransfer,
} from '../generated/Badges/Badges';
import { Transfer as RaftTransfer, Raft as RaftContract } from '../generated/Raft/Raft';
import { BadgeSpec, Badge, Raft } from '../generated/schema';
import { log, json } from '@graphprotocol/graph-ts';
import { ipfs } from '@graphprotocol/graph-ts';
import { getCIDFromIPFSUri, getBadgeID, getRaftID, appendMetadataPath } from './utils';

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
  } else {
    raft = new Raft(raftID);
    raft.owner = to;
    raft.tokenId = tokenId;
    raft.totalBadgesCount = 0;
    raft.totalSpecsCount = 0;
    raft.createdAtTimestamp = timestamp;

    const raftContract = RaftContract.bind(event.address);
    raft.uri = raftContract.tokenURI(tokenId);

    const cid = getCIDFromIPFSUri(raft.uri);
    const metadataBytes = ipfs.cat(cid);
    if (metadataBytes) {
      const result = json.try_fromBytes(metadataBytes);
      if (result.isOk) {
        const name = result.value.toObject().get('name');
        raft.name = name !== null ? name.toString() : null;

        const description = result.value.toObject().get('description');
        raft.description = description !== null ? description.toString() : null;
      } else {
        log.error('handleRaftTransfer: error fetching metadata for {}', [cid]);
      }
    } else {
      log.error('handleRaftTransfer: Invalid IPFS for cid {} for raftID {}', [cid, raftID]);
    }
  }
  raft.save();
}

export function handleSpecCreated(event: SpecCreated): void {
  const cid = getCIDFromIPFSUri(event.params.specUri);
  const uri = appendMetadataPath(event.params.specUri);
  const raftAddress = event.params.raftAddress;
  const raftTokenId = event.params.raftTokenId;``
  const raftID = getRaftID(raftTokenId, raftAddress);
  const timestamp = event.block.timestamp;

  let spec = new BadgeSpec(cid);
  spec.uri = uri;
  spec.raft = raftID;
  spec.createdAtTimestamp = timestamp;
  spec.totalBadgesCount = 0;

  const cidPath = appendMetadataPath(cid);
  const metadataBytes = ipfs.cat(cidPath);
  if (metadataBytes) {
    const result = json.try_fromBytes(metadataBytes);
    if (result.isOk) {
      const name = result.value.toObject().get('name');
      spec.name = name !== null ? name.toString() : null;

      const description = result.value.toObject().get('description');
      spec.description = description !== null ? description.toString() : null;
    } else {
      log.error('handleSpecCreated: error fetching metadata for {}', [cid]);
    }
  } else {
    log.error('handleSpecCreated: Invalid cid {} for {}', [cid, uri]);
  }
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
  const specID = getCIDFromIPFSUri(specUri);

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
