import { describe, test, assert } from 'matchstick-as';
import {
  buildCIDPathFromRaftUri,
  getCIDFromIPFSUri,
  getFullMetadataPath,
} from '../src/utils/helper';

describe('utils', () => {
  test('Should get cid from an IPFS link', () => {
    const uri = 'ipfs://bafyreicwfifynqtubhc5k2iiy37ozcthimwu6qfqkrgrdu5gmnvzgfdxdm';
    const expected = 'bafyreicwfifynqtubhc5k2iiy37ozcthimwu6qfqkrgrdu5gmnvzgfdxdm';

    const actual = getCIDFromIPFSUri(uri);
    assert.stringEquals(expected, actual);
  });

  test('Should get cid from an IPFS link with metadata path', () => {
    const uri = 'ipfs://bafyreicwfifynqtubhc5k2iiy37ozcthimwu6qfqkrgrdu5gmnvzgfdxdm/metadata.json';
    const expected = 'bafyreicwfifynqtubhc5k2iiy37ozcthimwu6qfqkrgrdu5gmnvzgfdxdm';

    const actual = getCIDFromIPFSUri(uri);
    assert.stringEquals(expected, actual);
  });

  test('Should get cid from an NFT Storage link', () => {
    const uri =
      'https://bafkreigl5rp3pbd52umxjw2wgcgvh5gywtvmhqkazaolad6mcqdrtpop3i.ipfs.nftstorage.link/';
    const expected = 'bafkreigl5rp3pbd52umxjw2wgcgvh5gywtvmhqkazaolad6mcqdrtpop3i';

    const actual = getCIDFromIPFSUri(uri);
    assert.stringEquals(expected, actual);
  });

  test('Should get cid from an IPFS gateway link', () => {
    const uri = 'https://ipfs.io/ipfs/bafyreih34i2tlahqj3obyjidjmypsmhtugy2jjjwgk7owiskvunusr3ovu';
    const expected = 'bafyreih34i2tlahqj3obyjidjmypsmhtugy2jjjwgk7owiskvunusr3ovu';

    const actual = getCIDFromIPFSUri(uri);
    assert.stringEquals(expected, actual);
  });

  test('Should construct full path to metadata when only CID is provided', () => {
    const expected =
      'ipfs://bafyreicwfifynqtubhc5k2iiy37ozcthimwu6qfqkrgrdu5gmnvzgfdxdm/metadata.json';
    const cid = 'bafyreicwfifynqtubhc5k2iiy37ozcthimwu6qfqkrgrdu5gmnvzgfdxdm';

    const actual = getFullMetadataPath(cid);
    assert.stringEquals(expected, actual);
  });

  test('Should construct CID path with metadata part when uri has metadata part', () => {
    const uri = 'ipfs://bafyreicwfifynqtubhc5k2iiy37ozcthimwu6qfqkrgrdu5gmnvzgfdxdm/metadata.json';
    const expected = 'bafyreicwfifynqtubhc5k2iiy37ozcthimwu6qfqkrgrdu5gmnvzgfdxdm/metadata.json';

    const actual = buildCIDPathFromRaftUri(uri);
    assert.stringEquals(expected, actual);
  });

  test('Should construct CID path without metadata part when uri does not have metadata part', () => {
    const uri = 'ipfs://bafyreicwfifynqtubhc5k2iiy37ozcthimwu6qfqkrgrdu5gmnvzgfdxdm';
    const expected = 'bafyreicwfifynqtubhc5k2iiy37ozcthimwu6qfqkrgrdu5gmnvzgfdxdm';

    const actual = buildCIDPathFromRaftUri(uri);
    assert.stringEquals(expected, actual);
  });

  test('Should return invalid-cid value for invalid CID in Raft URI', () => {
    const uri = 'blahhhh';
    const expected = 'invalid-cid';

    const actual = buildCIDPathFromRaftUri(uri);
    assert.stringEquals(expected, actual);
  });

  test('Should return invalid-cid value for an invalid CID in Spec URI', () => {
    const uri = 'blahhhh';
    const expected = 'invalid-cid';

    const actual = getCIDFromIPFSUri(uri);
    assert.stringEquals(expected, actual);
  });
});
