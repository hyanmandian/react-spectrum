/*
 * Copyright 2020 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import {action} from '@storybook/addon-actions';
import {chain} from '@react-aria/utils';
import {classNames} from '@react-spectrum/utils';
import dndStyles from './dnd.css';
import dropIndicatorStyles from '@adobe/spectrum-css-temp/components/dropindicator/vars.css';
import {DroppableCollectionDropEvent} from '@react-types/shared';
import {FocusRing} from '@react-aria/focus';
import Folder from '@spectrum-icons/workflow/Folder';
import {GridCollection, useGridState} from '@react-stately/grid';
import {Item} from '@react-stately/collections';
import {ListKeyboardDelegate} from '@react-aria/selection';
import {mergeProps} from '@react-aria/utils';
import {Provider, useProvider} from '@react-spectrum/provider';
import React from 'react';
import ShowMenu from '@spectrum-icons/workflow/ShowMenu';
import {useButton} from '@react-aria/button';
import {useDraggableCollectionState, useDroppableCollectionState} from '@react-stately/dnd';
import {useDraggableItem, useDropIndicator, useDroppableCollection} from '..';
import {useGrid, useGridCell, useGridRow} from '@react-aria/grid';
import {useId} from '@react-aria/utils';
import {useListData} from '@react-stately/data';
import {useListState} from '@react-stately/list';
import {useVisuallyHidden} from '@react-aria/visually-hidden';

export function ReorderableGridExample(props) {
  let list = useListData({
    initialItems: props.items || [
      {id: '1', type: 'item', text: 'One'},
      {id: '2', type: 'item', text: 'Two'},
      {id: '3', type: 'item', text: 'Three'},
      {id: '4', type: 'item', text: 'Four'},
      {id: '5', type: 'item', text: 'Five'},
      {id: '6', type: 'item', text: 'Six'}
    ]
  });

  let onDrop = async (e: DroppableCollectionDropEvent) => {
    if (e.target.type !== 'root' && e.target.dropPosition !== 'on') {
      let items = [];
      for (let item of e.items) {
        if (item.kind === 'text') {
          let type: string;
          if (item.types.has('folder')) {
            type = 'folder';
          } else if (item.types.has('item')) {
            type = 'item';
          }

          if (!type) {
            continue;
          }

          let data = JSON.parse(await item.getText(type));
          items.push(data.id);
        }
      }

      if (e.target.dropPosition === 'before') {
        list.moveBefore(e.target.key, items);
      } else {
        list.moveAfter(e.target.key, items);
      }
    }
  };

  return (
    <ReorderableGrid items={list.items} onDrop={onDrop}>
      {item => (
        <Item textValue={item.text}>
          {item.type === 'folder' && <Folder size="S" />}
          <span>{item.text}</span>
        </Item>
      )}
    </ReorderableGrid>
  );
}

function ReorderableGrid(props) {
  let ref = React.useRef<HTMLDivElement>(null);
  let onDrop = action('onDrop');
  let state = useListState(props);
  let keyboardDelegate = new ListKeyboardDelegate(state.collection, new Set(), ref);
  let gridState = useGridState({
    selectionMode: 'multiple',
    collection: new GridCollection({
      columnCount: 1,
      items: [...state.collection].map(item => ({
        ...item,
        childNodes: [{
          key: `cell-${item.key}`,
          type: 'cell',
          index: 0,
          value: null,
          level: 0,
          rendered: null,
          textValue: item.textValue,
          hasChildNodes: false,
          childNodes: []
        }]
      }))
    })
  });

  let provider = useProvider();
  let dragState = useDraggableCollectionState({
    collection: gridState.collection,
    selectionManager: gridState.selectionManager,
    getItems(keys) {
      return [...keys].map(key => {
        let item = gridState.collection.getItem(key);

        return {
          // @ts-ignore
          [item.value.type]: JSON.stringify(item.value),
          'text/plain': item.textValue
        };
      });
    },
    renderPreview(selectedKeys, draggedKey) {
      let item = gridState.collection.getItem(draggedKey);
      return (
        <Provider {...provider}>
          <div className={classNames(dndStyles, 'draggable', 'is-drag-preview', {'is-dragging-multiple': selectedKeys.size > 1})}>
            <div className={classNames(dndStyles, 'drag-handle')}>
              <ShowMenu size="XS" />
            </div>
            <span>{item.rendered}</span>
            {selectedKeys.size > 1 &&
              <div className={classNames(dndStyles, 'badge')}>{selectedKeys.size}</div>
            }
          </div>
        </Provider>
      );
    },
    onDragStart: action('onDragStart'),
    onDragEnd: chain(action('onDragEnd'), props.onDragEnd)
  });

  let dropState = useDroppableCollectionState({
    collection: gridState.collection,
    selectionManager: gridState.selectionManager,
    getDropOperation(target) {
      if (target.type === 'root' || target.dropPosition === 'on') {
        return 'cancel';
      }

      return 'move';
    }
  });

  let {collectionProps} = useDroppableCollection({
    keyboardDelegate,
    onDropEnter: chain(action('onDropEnter'), console.log),
    // onDropMove: action('onDropMove'),
    onDropExit: chain(action('onDropExit'), console.log),
    onDropActivate: chain(action('onDropActivate'), console.log),
    onDrop: async e => {
      onDrop(e);
      props.onDrop?.(e);
    },
    getDropTargetFromPoint(x, y) {
      let rect = ref.current.getBoundingClientRect();
      x += rect.x;
      y += rect.y;
      let closest = null;
      let closestDistance = Infinity;
      let closestDir = null;

      for (let child of ref.current.children) {
        if (!(child as HTMLElement).dataset.key) {
          continue;
        }

        let r = child.getBoundingClientRect();
        let points: [number, number, string][] = [
          [r.left, r.top, 'before'],
          [r.right, r.top, 'before'],
          [r.left, r.bottom, 'after'],
          [r.right, r.bottom, 'after']
        ];

        for (let [px, py, dir] of points) {
          let dx = px - x;
          let dy = py - y;
          let d = dx * dx + dy * dy;
          if (d < closestDistance) {
            closestDistance = d;
            closest = child;
            closestDir = dir;
          }
        }

        if (y >= r.top + 10 && y <= r.bottom - 10) {
          closestDir = 'on';
        }
      }

      let key = closest?.dataset.key;
      if (key) {
        return {
          type: 'item',
          key,
          dropPosition: closestDir
        };
      }
    }
  }, dropState, ref);

  let {gridProps} = useGrid({
    ...props,
    ref,
    'aria-label': 'Reorderable list',
    focusMode: 'cell'
  }, gridState);

  let isDropTarget = dropState.isDropTarget({type: 'root'});
  let dropRef = React.useRef();
  let {dropIndicatorProps} = useDropIndicator({
    target: {type: 'root'}
  }, dropState, dropRef);
  let {visuallyHiddenProps} = useVisuallyHidden();

  return (
    <div
      {...mergeProps(collectionProps, gridProps)}
      ref={ref}
      className={classNames(dndStyles, 'droppable-collection', {'is-drop-target': isDropTarget})}>
      {!dropIndicatorProps['aria-hidden'] &&
        <div role="row" aria-hidden={dropIndicatorProps['aria-hidden']}>
          <div
            role="gridcell"
            aria-selected="false">
            <div {...visuallyHiddenProps} role="button" tabIndex={-1} {...dropIndicatorProps} ref={dropRef} />
          </div>
        </div>
      }
      {[...gridState.collection].map(item => (
        <>
          <InsertionIndicator
            key={item.key + '-before'}
            collectionRef={ref}
            target={{type: 'item', key: item.key, dropPosition: 'before'}}
            dropState={dropState} />
          <CollectionItem
            key={item.key}
            item={item}
            state={gridState}
            dragState={dragState}
            dropState={dropState} />
          {gridState.collection.getKeyAfter(item.key) == null &&
            <InsertionIndicator
              key={item.key + '-after'}
              target={{type: 'item', key: item.key, dropPosition: 'after'}}
              collectionRef={ref}
              dropState={dropState} />
          }
        </>
      ))}
    </div>
  );
}

function CollectionItem({item, state, dragState, dropState}) {
  let rowRef = React.useRef();
  let cellRef = React.useRef();
  let cellNode = [...item.childNodes][0];
  let isSelected = state.selectionManager.isSelected(item.key);

  let {rowProps} = useGridRow({
    node: item,
    ref: rowRef,
    isSelected
  }, state);
  let {gridCellProps} = useGridCell({
    node: cellNode,
    ref: cellRef,
    focusMode: 'cell',
    shouldSelectOnPressUp: true
  }, state);

  let {dragProps, dragButtonProps} = useDraggableItem({key: item.key}, dragState);

  let dragButtonRef = React.useRef();
  let {buttonProps} = useButton({
    ...dragButtonProps,
    elementType: 'div'
  }, dragButtonRef);

  let dropIndicatorRef = React.useRef();
  let {dropIndicatorProps} = useDropIndicator({
    target: {type: 'item', key: item.key, dropPosition: 'on'}
  }, dropState, dropIndicatorRef);
  let {visuallyHiddenProps} = useVisuallyHidden();
  let id = useId();

  return (
    <div {...rowProps} ref={rowRef} style={{outline: 'none'}} aria-labelledby={id}>
      <FocusRing focusRingClass={classNames(dndStyles, 'focus-ring')}>
        <div
          {...mergeProps(gridCellProps, dragProps)}
          aria-labelledby={id}
          ref={cellRef}
          className={classNames(dndStyles, 'draggable', 'droppable', {
            'is-dragging': dragState.isDragging(item.key),
            'is-drop-target': dropState.isDropTarget({type: 'item', key: item.key, dropPosition: 'on'}),
            'is-selected': state.selectionManager.isSelected(item.key)
          })}>
          <FocusRing focusRingClass={classNames(dndStyles, 'focus-ring')}>
            <div
              {...buttonProps as React.HTMLAttributes<HTMLElement>}
              ref={dragButtonRef}
              className={classNames(dndStyles, 'drag-handle')}>
              <ShowMenu size="XS" />
            </div>
          </FocusRing>
          <span id={id}>{item.rendered}</span>
          {!dropIndicatorProps['aria-hidden'] &&
            <div {...visuallyHiddenProps} role="button" {...dropIndicatorProps} ref={dropIndicatorRef} />
          }
        </div>
      </FocusRing>
    </div>
  );
}

function InsertionIndicator(props) {
  let ref = React.useRef();
  let {dropIndicatorProps} = useDropIndicator(props, props.dropState, ref);
  let {visuallyHiddenProps} = useVisuallyHidden();

  // If aria-hidden, we are either not in a drag session or the drop target is invalid.
  // In that case, there's no need to render anything at all unless we need to show the indicator visually.
  // This can happen when dragging using the native DnD API as opposed to keyboard dragging.
  if (!props.dropState.isDropTarget(props.target) && dropIndicatorProps['aria-hidden']) {
    return null;
  }

  return (
    <div role="row" aria-hidden={dropIndicatorProps['aria-hidden']}>
      <div
        role="gridcell"
        aria-selected="false"
        className={props.dropState.isDropTarget(props.target)
        ? classNames(dropIndicatorStyles, 'spectrum-DropIndicator', 'spectrum-DropIndicator--horizontal')
        : null
      }
        style={{
          width: '100%',
          marginLeft: 0,
          height: 2,
          marginBottom: -2,
          outline: 'none'
        }}>
        <div {...visuallyHiddenProps} role="button" {...dropIndicatorProps} ref={ref} />
      </div>
    </div>
  );
}
