import { Badges, SpecCreated, Transfer } from '../generated/Badges/Badges';
import { BadgeSpec, Badge } from '../generated/schema';
import { ethereum, BigInt } from '@graphprotocol/graph-ts';

const metadataPart = '/metadata.json';

function getCID(uri: string): string {
  return uri.substring(uri.lastIndexOf('/') + 1);
}

function getMetadataUri(uri: string): string {
  return uri.concat(metadataPart);
}

export function handleSpecCreated(event: SpecCreated): void {
  const id = getCID(event.params.specUri);
  const uri = getMetadataUri(event.params.specUri);
  const raftTokenId = event.params.raftTokenId;
  const raftAddress = event.params.raftAddress;
  const timestamp = event.block.timestamp;

  let spec = new BadgeSpec(id);
  spec.uri = uri;
  spec.raftTokenId = raftTokenId;
  spec.raftTokenAddress = raftAddress;
  spec.createdAtTimestamp = timestamp;
  spec.totalBadgesCount = 0;
  spec.save();
}

export function handleBadgeMinted(event: Transfer): void {
  const id = event.params.tokenId;
  const from = event.params.from;
  const to = event.params.to;
  const timestamp = event.block.timestamp;

  const badgesContract = Badges.bind(event.address);
  const specUri = badgesContract.tokenURI(id);
  const specId = getCID(specUri);

  let badge = new Badge(id.toString());
  badge.from = from;
  badge.owner = to;
  badge.spec = specId;
  badge.createdAtTimestamp = timestamp;
  badge.save();

  const spec = BadgeSpec.load(specId);
  if (spec !== null) {
    spec.totalBadgesCount += 1;
    spec.save();
  }
}
