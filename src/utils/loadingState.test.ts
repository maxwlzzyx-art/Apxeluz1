import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_COLLECTION_LOAD_STATE,
  getSkeletonCountForLayout,
  isCollectionLoading,
} from './loadingState';

test('isCollectionLoading stays true initially when itemCount is 0', () => {
  assert.equal(isCollectionLoading(INITIAL_COLLECTION_LOAD_STATE, 0), true);
});

test('isCollectionLoading stays true if REST finishes empty while Supabase is still pending', () => {
  assert.equal(
    isCollectionLoading({ supabaseSettled: false, restSettled: true }, 0),
    true
  );
});

test('isCollectionLoading returns false immediately when items arrive even if one source is pending', () => {
  assert.equal(
    isCollectionLoading({ supabaseSettled: true, restSettled: false }, 3),
    false
  );
  assert.equal(
    isCollectionLoading({ supabaseSettled: false, restSettled: false }, 1),
    false
  );
});

test('isCollectionLoading returns false once both Supabase and REST settle with 0 items', () => {
  assert.equal(
    isCollectionLoading({ supabaseSettled: true, restSettled: true }, 0),
    false
  );
});

test('getSkeletonCountForLayout returns expected slot counts', () => {
  assert.equal(getSkeletonCountForLayout('row'), 5);
  assert.equal(getSkeletonCountForLayout('premium'), 5);
  assert.equal(getSkeletonCountForLayout('categories'), 5);
  assert.equal(getSkeletonCountForLayout('grid'), 10);
});
