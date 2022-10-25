import { BigInt, Address, Bytes, ipfs } from '@graphprotocol/graph-ts';

const raftsUrnNamespace = 'rafts';
const badgesUrnNamespace = 'badges';
const metadataPart = '/metadata.json';
const excludedCids = ['invalid-cid'];

// returns a fully formed metadata uri for raft & badge metadata
export function appendMetadataPath(uri: string): string {
  return uri.concat(metadataPart);
}

export function getFullMetadataPath(cid: string): string {
  return `ipfs://${cid}${metadataPart}`;
}

export function buildCIDPathFromRaftUri(uri: string): string {
  const cid = getCIDFromIPFSUri(uri);
  let cidPath = '';

  if (cid.length < 30 || cid.includes(' ') || !['ba','Qm'].includes(cid.substring(0,2))) {
    cidPath = 'invalid-cid';
  } else if (uri.indexOf(metadataPart) >= 0) {
    cidPath = appendMetadataPath(cid);
  } else {
    cidPath = cid;
  }

  return cidPath;
}

// returns a string that is a CID extracted from the IPFS uri
export function getCIDFromIPFSUri(uri: string): string {
  let cid = '';
  if (uri.indexOf('ipfs://') >= 0 || uri.indexOf('https://ipfs.io') >= 0) {
    uri = uri.replaceAll(metadataPart, '');
    cid = uri.substring(uri.lastIndexOf('/') + 1);
  } else if (uri.indexOf('nftstorage') > 0) {
    const parts = uri.split('.');
    const cidPart = parts[0];
    cid = cidPart.substring(cidPart.lastIndexOf('/') + 1);
  } else {
    cid = uri;
  }

  if (cid.length < 30 || cid.includes(' ') || !['ba','Qm'].includes(cid.substring(0,2))) {
    return 'invalid-cid';
  }

  return cid;
}

// returns a string representing the raftID in the format `rafts:raftAddress:raftTokenId`
export function getRaftID(raftTokenId: BigInt, raftAddress: Address): string {
  return raftsUrnNamespace.concat(':').concat(raftTokenId.toString());
}

// returns a string representing a unique badgeID in the format `badges:badgeAddress:badgeTokenId`
export function getBadgeID(badgeTokenId: BigInt, badgeAddress: Address): string {
  return badgesUrnNamespace.concat(':').concat(badgeTokenId.toString());
}

export function getIPFSMetadataBytes(cid: string): Bytes | null {
  let metadataBytes = ipfs.cat(cid);
  if (!metadataBytes) {
    const cidPath = appendMetadataPath(cid);
    metadataBytes = ipfs.cat(cidPath);
  }

  return metadataBytes;
}

export function getReasonString(reasonCode: u32): string {
  switch (reasonCode) {
    case 1:
      return 'hello';

    default:
      return 'other';
  }
}

export function isValidCID(cid: string): boolean {
  return cid.length > 0 && !excludedCids.includes(cid);
}
