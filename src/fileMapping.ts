import { SpecMetadata, RaftMetadata } from '../generated/schema';
import { log, json, JSONValue, JSONValueKind, Bytes, dataSource } from '@graphprotocol/graph-ts';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export function handleSpecMetadata(content: Bytes): void {

  let context = dataSource.context()
  let cid = context.getString('ipfsHash')
  log.warning('--> got metadata {}', [cid])

  const result = json.try_fromBytes(content);
  if (result.isOk) {
    const spec = new SpecMetadata(cid)
    spec.name = (result.value.toObject().get('name') as JSONValue).toString();
    spec.description = (result.value.toObject().get('description') as JSONValue).toString();
    spec.image = (result.value.toObject().get('image') as JSONValue).toString();

    const properties = result.value.toObject().get('properties');
    const expiresAtJsonValue =
      properties !== null ? properties.toObject().get('expiresAt') : null;

    spec.expiresAt =
      expiresAtJsonValue !== null && expiresAtJsonValue.kind === JSONValueKind.STRING
        ? expiresAtJsonValue.toString()
        : null;
    spec.save()
  } else {
    log.error('handleSpecCreated: error fetching metadata for {}', [cid]);
  }
}

export function handleRaftMetadata(content: Bytes): void {

  let context = dataSource.context()
  let cid = context.getString('ipfsHash')
  log.warning('--> got metadata {}', [cid])

  const result = json.try_fromBytes(content);
  if (result.isOk) {
    const raft = new RaftMetadata(cid)
    raft.name = (result.value.toObject().get('name') as JSONValue).toString();
    raft.description = (result.value.toObject().get('description') as JSONValue).toString();
    raft.image = (result.value.toObject().get('image') as JSONValue).toString();
    raft.save()
  } else {
    log.error('handleSetTokenURI: error fetching the metadata for {}', [cid]);
  }
}
