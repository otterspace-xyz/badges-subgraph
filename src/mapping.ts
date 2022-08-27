import { Badges, SpecCreated, Transfer } from '../generated/Badges/Badges';
import { BadgeSpec, Badge } from '../generated/schema';

export function handleSpecCreated(event: SpecCreated): void {
  const id = event.params.specUri;
  const raftTokenId = event.params.raftTokenId;
  const raftAddress = event.params.raftAddress;
  const timestamp = event.block.timestamp;

  let spec = new BadgeSpec(id);
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

  let badge = new Badge(id.toString());
  badge.from = from;
  badge.owner = to;
  badge.spec = specUri;
  badge.createdAtTimestamp = timestamp;
  badge.save();

  const spec = BadgeSpec.load(specUri);
  if (spec !== null) {
    spec.totalBadgesCount++;
    spec.save();
  }
}
