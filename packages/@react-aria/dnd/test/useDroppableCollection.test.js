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

import {act, fireEvent, render, waitFor, within} from '@testing-library/react';
import {DataTransfer, DragEvent} from './mocks';
import {Draggable} from './examples';
import {DroppableGridExample} from '../stories/DroppableGrid';
import React from 'react';
import userEvent from '@testing-library/user-event';

describe('useDroppableCollection', () => {
  beforeEach(() => {
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => setTimeout(cb, 0));
    jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
      let y = 0;
      let height = 50;
      let el = this;
      if (el.getAttribute('role') === 'gridcell') {
        el = this.closest('[role="row"]');
      }

      if (el.getAttribute('role') === 'row') {
        y = [...el.parentElement.children].filter(c => c === el || c.dataset.key).indexOf(el) * 50;
      }

      if (el.getAttribute('role') === 'grid') {
        height = 150;
      }

      return {
        left: 0,
        right: 100,
        top: y,
        bottom: y + height,
        x: 0,
        y,
        width: 100,
        height
      };
    });

    jest.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockImplementation(function () {
      return this.getBoundingClientRect().top;
    });

    jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function () {
      return this.getBoundingClientRect().height;
    });

    jest.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(function () {
      if (this.getAttribute('role') === 'grid') {
        return 50 * this.querySelectorAll('[role="gridcell"][data-key]').length;
      }
      return this.getBoundingClientRect().height;
    });

    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => jest.runAllTimers());
  });

  describe('native drag and drop', () => {
    afterEach(() => {
      // Cancel auto scroll
      fireEvent(document.querySelector('[role="grid"]'), new DragEvent('dragleave', {}));
    });

    it('should perform basic drag and drop', async () => {
      let onDropEnter = jest.fn();
      let onDragExit = jest.fn();
      let onDrop = jest.fn();
      let tree = render(<>
        <Draggable />
        <DroppableGridExample onDropEnter={onDropEnter} onDropExit={onDragExit} onDrop={onDrop} />
      </>);

      let draggable = tree.getByText('Drag me');
      let grid = tree.getByRole('grid');
      let cells = within(grid).getAllByRole('gridcell');
      expect(cells).toHaveLength(3);

      let dataTransfer = new DataTransfer();
      fireEvent(draggable, new DragEvent('dragstart', {dataTransfer, clientX: 0, clientY: 0}));
      act(() => jest.runAllTimers());
      expect(draggable).toHaveAttribute('data-dragging', 'true');

      fireEvent(cells[0], new DragEvent('dragenter', {dataTransfer, clientX: 1, clientY: 1}));
      expect(onDropEnter).toHaveBeenCalledTimes(1);
      expect(onDropEnter).toHaveBeenLastCalledWith({
        type: 'dropenter',
        x: 0,
        y: 0,
        target: {type: 'item', key: '1', dropPosition: 'before'}
      });

      let allCells = within(grid).getAllByRole('gridcell', {hidden: true});
      expect(allCells).toHaveLength(4);
      let dropIndicator = within(allCells[0]).getByRole('button', {hidden: true});
      expect(dropIndicator).toHaveAttribute('aria-roledescription', 'drop indicator');

      fireEvent(cells[0], new DragEvent('dragover', {dataTransfer, clientX: 1, clientY: 20}));
      expect(onDragExit).toHaveBeenCalledTimes(1);
      expect(onDragExit).toHaveBeenLastCalledWith({
        type: 'dropexit',
        x: 0,
        y: 0,
        target: {type: 'item', key: '1', dropPosition: 'before'}
      });

      expect(onDropEnter).toHaveBeenCalledTimes(2);
      expect(onDropEnter).toHaveBeenLastCalledWith({
        type: 'dropenter',
        x: 0,
        y: 0,
        target: {type: 'item', key: '1', dropPosition: 'on'}
      });

      allCells = within(grid).getAllByRole('gridcell', {hidden: true});
      expect(allCells).toHaveLength(3);

      fireEvent(cells[0], new DragEvent('dragover', {dataTransfer, clientX: 1, clientY: 55}));
      expect(onDragExit).toHaveBeenCalledTimes(2);
      expect(onDragExit).toHaveBeenLastCalledWith({
        type: 'dropexit',
        x: 0,
        y: 0,
        target: {type: 'item', key: '1', dropPosition: 'on'}
      });

      expect(onDropEnter).toHaveBeenCalledTimes(3);
      expect(onDropEnter).toHaveBeenLastCalledWith({
        type: 'dropenter',
        x: 0,
        y: 0,
        target: {type: 'item', key: '1', dropPosition: 'after'}
      });

      allCells = within(grid).getAllByRole('gridcell', {hidden: true});
      expect(allCells).toHaveLength(4);
      dropIndicator = within(allCells[1]).getByRole('button', {hidden: true});
      expect(dropIndicator).toHaveAttribute('aria-roledescription', 'drop indicator');

      fireEvent(cells[1], new DragEvent('dragover', {dataTransfer, clientX: 1, clientY: 80}));
      expect(onDragExit).toHaveBeenCalledTimes(3);
      expect(onDragExit).toHaveBeenLastCalledWith({
        type: 'dropexit',
        x: 0,
        y: 0,
        target: {type: 'item', key: '1', dropPosition: 'after'}
      });

      expect(onDropEnter).toHaveBeenCalledTimes(4);
      expect(onDropEnter).toHaveBeenLastCalledWith({
        type: 'dropenter',
        x: 0,
        y: 0,
        target: {type: 'root'}
      });

      allCells = within(grid).getAllByRole('gridcell', {hidden: true});
      expect(allCells).toHaveLength(3);
      expect(grid).toHaveAttribute('data-droptarget', 'true');

      fireEvent(cells[2], new DragEvent('dragover', {dataTransfer, clientX: 1, clientY: 100}));
      expect(onDragExit).toHaveBeenCalledTimes(4);
      expect(onDragExit).toHaveBeenLastCalledWith({
        type: 'dropexit',
        x: 0,
        y: 0,
        target: {type: 'root'}
      });

      expect(onDropEnter).toHaveBeenCalledTimes(5);
      expect(onDropEnter).toHaveBeenLastCalledWith({
        type: 'dropenter',
        x: 0,
        y: 0,
        target: {type: 'item', key: '2', dropPosition: 'after'}
      });

      allCells = within(grid).getAllByRole('gridcell', {hidden: true});
      expect(allCells).toHaveLength(4);
      dropIndicator = within(allCells[2]).getByRole('button', {hidden: true});
      expect(dropIndicator).toHaveAttribute('aria-roledescription', 'drop indicator');

      fireEvent(cells[2], new DragEvent('drop', {dataTransfer, clientX: 2, clientY: 2}));
      act(() => jest.runAllTimers());
      expect(onDrop).toHaveBeenCalledTimes(1);
      expect(onDrop).toHaveBeenCalledWith({
        type: 'drop',
        x: 2,
        y: 2,
        target: {type: 'item', key: '2', dropPosition: 'after'},
        dropOperation: 'move',
        items: [
          {
            kind: 'text',
            types: new Set(['text/plain']),
            getText: expect.any(Function)
          }
        ]
      });

      await waitFor(() => expect(within(grid).getAllByRole('gridcell')).toHaveLength(4));
      cells = within(grid).getAllByRole('gridcell');
      expect(cells.map(cell => cell.textContent)).toEqual(['One', 'Two', 'hello world', 'Three']);

      expect(await onDrop.mock.calls[0][0].items[0].getText('text/plain')).toBe('hello world');
    });

    it('should auto scroll when near the bottom', () => {
      let onDropEnter = jest.fn();
      let onDragExit = jest.fn();
      let onDrop = jest.fn();
      let items = [];
      for (let i = 0; i < 6; i++) {
        items.push({id: '' + i, type: 'item', text: `Item ${i}`});
      }
      let tree = render(<>
        <Draggable />
        <DroppableGridExample style={{overflow: 'scroll'}} items={items} onDropEnter={onDropEnter} onDropExit={onDragExit} onDrop={onDrop} />
      </>);

      let draggable = tree.getByText('Drag me');
      let grid = tree.getByRole('grid');
      let cells = within(grid).getAllByRole('gridcell');
      expect(cells).toHaveLength(6);

      let scrollTop = jest.spyOn(grid, 'scrollTop', 'set');

      let dataTransfer = new DataTransfer();
      fireEvent(draggable, new DragEvent('dragstart', {dataTransfer, clientX: 0, clientY: 0}));
      act(() => jest.runAllTimers());
      expect(draggable).toHaveAttribute('data-dragging', 'true');

      fireEvent(cells[0], new DragEvent('dragenter', {dataTransfer, clientX: 30, clientY: 30}));
      act(() => jest.runOnlyPendingTimers());
      expect(scrollTop).not.toHaveBeenCalled();

      fireEvent(cells[2], new DragEvent('dragover', {dataTransfer, clientX: 30, clientY: 100}));
      act(() => jest.runOnlyPendingTimers());
      expect(scrollTop).not.toHaveBeenCalled();

      fireEvent(cells[4], new DragEvent('dragover', {dataTransfer, clientX: 30, clientY: 135}));
      act(() => jest.runOnlyPendingTimers());
      expect(scrollTop).toHaveBeenCalledTimes(1);
      act(() => jest.runOnlyPendingTimers());
      expect(scrollTop).toHaveBeenCalledTimes(2);
      jest.clearAllTimers();

      fireEvent(cells[2], new DragEvent('dragover', {dataTransfer, clientX: 30, clientY: 100}));
      act(() => jest.runAllTimers());
      expect(scrollTop).toHaveBeenCalledTimes(2);

      fireEvent(cells[2], new DragEvent('dragover', {dataTransfer, clientX: 30, clientY: 15}));
      act(() => jest.runOnlyPendingTimers());
      expect(scrollTop).toHaveBeenCalledTimes(3);
      jest.clearAllTimers();

      fireEvent(cells[2], new DragEvent('dragover', {dataTransfer, clientX: 30, clientY: 30}));
      act(() => jest.runAllTimers());
      expect(scrollTop).toHaveBeenCalledTimes(3);
    });
  });

  describe('keyboard', () => {
    let pressKey = (key) => {
      fireEvent.keyDown(document.activeElement, {key});
      fireEvent.keyUp(document.activeElement, {key});
    };

    afterEach(() => {
      fireEvent.keyDown(document.body, {key: 'Escape'});
      fireEvent.keyUp(document.body, {key: 'Escape'});
    });

    it('should perform basic drag and drop', async () => {
      let onDrop = jest.fn();
      let tree = render(<>
        <Draggable />
        <DroppableGridExample onDrop={onDrop} />
      </>);

      let draggable = tree.getByText('Drag me');
      let grid = tree.getByRole('grid');
      let cells = within(grid).getAllByRole('gridcell');
      expect(cells).toHaveLength(3);

      userEvent.tab();
      expect(document.activeElement).toBe(draggable);

      pressKey('Enter');
      act(() => jest.runAllTimers());

      cells = within(grid).getAllByRole('gridcell');
      expect(cells).toHaveLength(7);

      expect(document.activeElement).toBe(within(cells[0]).getByRole('button'));

      pressKey('ArrowDown');
      expect(document.activeElement).toBe(within(cells[1]).getByRole('button'));

      pressKey('ArrowDown');
      expect(document.activeElement).toBe(within(cells[2]).getByRole('button'));

      pressKey('ArrowDown');
      expect(document.activeElement).toBe(within(cells[3]).getByRole('button'));

      pressKey('Enter');
      expect(onDrop).toHaveBeenCalledTimes(1);
      expect(onDrop).toHaveBeenCalledWith({
        type: 'drop',
        x: 50,
        y: 75,
        target: {type: 'item', key: '2', dropPosition: 'before'},
        dropOperation: 'move',
        items: [
          {
            kind: 'text',
            types: new Set(['text/plain']),
            getText: expect.any(Function)
          }
        ]
      });

      await waitFor(() => expect(within(grid).getAllByRole('gridcell')).toHaveLength(4));
      cells = within(grid).getAllByRole('gridcell');
      expect(cells.map(cell => cell.textContent)).toEqual(['One', 'hello world', 'Two', 'Three']);

      expect(await onDrop.mock.calls[0][0].items[0].getText('text/plain')).toBe('hello world');
    });

    it('should support arrow key navigation', () => {
      let onDropEnter = jest.fn();
      let onDragExit = jest.fn();
      let tree = render(<>
        <Draggable />
        <DroppableGridExample onDropEnter={onDropEnter} onDropExit={onDragExit} />
      </>);

      let draggable = tree.getByText('Drag me');
      let grid = tree.getByRole('grid');
      let cells = within(grid).getAllByRole('gridcell');
      expect(cells).toHaveLength(3);

      userEvent.tab();
      expect(document.activeElement).toBe(draggable);

      pressKey('Enter');
      act(() => jest.runAllTimers());

      cells = within(grid).getAllByRole('gridcell');
      expect(cells).toHaveLength(7);

      let targets = [
        {type: 'root'},
        {type: 'item', key: '1', dropPosition: 'before'},
        {type: 'item', key: '1', dropPosition: 'on'},
        {type: 'item', key: '2', dropPosition: 'before'},
        {type: 'item', key: '3', dropPosition: 'before'},
        {type: 'item', key: '3', dropPosition: 'on'},
        {type: 'item', key: '3', dropPosition: 'after'}
      ];

      for (let i = 0; i < cells.length; i++) {
        if (i > 0) {
          pressKey('ArrowDown');
        }

        expect(document.activeElement).toBe(within(cells[i]).getByRole('button'));
        if (i > 0) {
          expect(onDragExit).toHaveBeenCalledTimes(i);
          expect(onDragExit).toHaveBeenLastCalledWith({
            type: 'dropexit',
            x: 0,
            y: 0,
            target: targets[i - 1]
          });
        }

        expect(onDropEnter).toHaveBeenCalledTimes(i + 1);
        expect(onDropEnter).toHaveBeenLastCalledWith({
          type: 'dropenter',
          x: 0,
          y: 0,
          target: targets[i]
        });
      }

      pressKey('ArrowDown');
      expect(document.activeElement).toBe(within(cells[0]).getByRole('button'));
      expect(onDragExit).toHaveBeenCalledTimes(7);
      expect(onDragExit).toHaveBeenLastCalledWith({
        type: 'dropexit',
        x: 0,
        y: 0,
        target: targets[targets.length - 1]
      });

      expect(onDropEnter).toHaveBeenCalledTimes(8);
      expect(onDropEnter).toHaveBeenLastCalledWith({
        type: 'dropenter',
        x: 0,
        y: 0,
        target: {type: 'root'}
      });

      for (let i = cells.length - 1; i >= 0; i--) {
        pressKey('ArrowUp');

        expect(document.activeElement).toBe(within(cells[i]).getByRole('button'));
        expect(onDragExit).toHaveBeenCalledTimes(7 + cells.length - i);
        expect(onDragExit).toHaveBeenLastCalledWith({
          type: 'dropexit',
          x: 0,
          y: 0,
          target: i === cells.length - 1 ? targets[0] : targets[i + 1]
        });

        expect(onDropEnter).toHaveBeenCalledTimes(cells.length + cells.length - i + 1);
        expect(onDropEnter).toHaveBeenLastCalledWith({
          type: 'dropenter',
          x: 0,
          y: 0,
          target: targets[i]
        });
      }

      pressKey('ArrowUp');
      expect(document.activeElement).toBe(within(cells[cells.length - 1]).getByRole('button'));
      expect(onDragExit).toHaveBeenCalledTimes(cells.length * 2 + 1);
      expect(onDragExit).toHaveBeenLastCalledWith({
        type: 'dropexit',
        x: 0,
        y: 0,
        target: targets[0]
      });

      expect(onDropEnter).toHaveBeenCalledTimes(cells.length * 2 + 2);
      expect(onDropEnter).toHaveBeenLastCalledWith({
        type: 'dropenter',
        x: 0,
        y: 0,
        target: targets[targets.length - 1]
      });
    });

    it('supports Home and End', () => {
      let onDropEnter = jest.fn();
      let onDragExit = jest.fn();
      let onDrop = jest.fn();
      let tree = render(<>
        <Draggable />
        <DroppableGridExample onDropEnter={onDropEnter} onDropExit={onDragExit} onDrop={onDrop} />
      </>);

      let draggable = tree.getByText('Drag me');
      let grid = tree.getByRole('grid');
      let cells = within(grid).getAllByRole('gridcell');
      expect(cells).toHaveLength(3);

      userEvent.tab();
      expect(document.activeElement).toBe(draggable);

      pressKey('Enter');
      act(() => jest.runAllTimers());

      cells = within(grid).getAllByRole('gridcell');
      expect(cells).toHaveLength(7);

      expect(onDropEnter).toHaveBeenCalledTimes(1);
      expect(onDropEnter).toHaveBeenLastCalledWith({
        type: 'dropenter',
        x: 0,
        y: 0,
        target: {type: 'root'}
      });

      pressKey('End');
      expect(onDragExit).toHaveBeenCalledTimes(1);
      expect(onDragExit).toHaveBeenLastCalledWith({
        type: 'dropexit',
        x: 0,
        y: 0,
        target: {type: 'root'}
      });

      expect(onDropEnter).toHaveBeenCalledTimes(2);
      expect(onDropEnter).toHaveBeenLastCalledWith({
        type: 'dropenter',
        x: 0,
        y: 0,
        target: {type: 'item', key: '3', dropPosition: 'after'}
      });

      pressKey('Home');
      expect(onDragExit).toHaveBeenCalledTimes(2);
      expect(onDragExit).toHaveBeenLastCalledWith({
        type: 'dropexit',
        x: 0,
        y: 0,
        target: {type: 'item', key: '3', dropPosition: 'after'}
      });

      expect(onDropEnter).toHaveBeenCalledTimes(3);
      expect(onDropEnter).toHaveBeenLastCalledWith({
        type: 'dropenter',
        x: 0,
        y: 0,
        target: {type: 'root'}
      });
    });

    it('supports PageUp and PageDown', () => {
      let onDropEnter = jest.fn();
      let onDragExit = jest.fn();
      let onDrop = jest.fn();
      let items = [];
      for (let i = 0; i < 6; i++) {
        items.push({id: '' + i, type: 'item', text: `Item ${i}`});
      }
      let tree = render(<>
        <Draggable />
        <DroppableGridExample items={items} onDropEnter={onDropEnter} onDropExit={onDragExit} onDrop={onDrop} />
      </>);

      let draggable = tree.getByText('Drag me');
      let grid = tree.getByRole('grid');
      let cells = within(grid).getAllByRole('gridcell');
      expect(cells).toHaveLength(6);

      userEvent.tab();
      expect(document.activeElement).toBe(draggable);

      pressKey('Enter');
      act(() => jest.runAllTimers());

      cells = within(grid).getAllByRole('gridcell');
      expect(cells).toHaveLength(13);

      let pageDownTargets = [
        {type: 'root'},
        {type: 'item', key: '2', dropPosition: 'after'},
        {type: 'item', key: '4', dropPosition: 'after'},
        {type: 'item', key: '5', dropPosition: 'after'}
      ];

      for (let i = 0; i < pageDownTargets.length; i++) {
        if (i > 0) {
          pressKey('PageDown');

          expect(onDragExit).toHaveBeenCalledTimes(i);
          expect(onDragExit).toHaveBeenLastCalledWith({
            type: 'dropexit',
            x: 0,
            y: 0,
            target: pageDownTargets[i - 1]
          });
        }

        expect(onDropEnter).toHaveBeenCalledTimes(i + 1);
        expect(onDropEnter).toHaveBeenLastCalledWith({
          type: 'dropenter',
          x: 0,
          y: 0,
          target: pageDownTargets[i]
        });
      }

      let pageUpTargets = [
        {type: 'item', key: '3', dropPosition: 'after'},
        {type: 'item', key: '1', dropPosition: 'after'},
        {type: 'item', key: '0', dropPosition: 'after'},
        {type: 'root'}
      ];

      for (let i = 0; i < pageUpTargets.length; i++) {
        pressKey('PageUp');
        expect(onDragExit).toHaveBeenCalledTimes(pageDownTargets.length + i);
        expect(onDragExit).toHaveBeenLastCalledWith({
          type: 'dropexit',
          x: 0,
          y: 0,
          target: i === 0 ? pageDownTargets[pageDownTargets.length - 1] : pageUpTargets[i - 1]
        });

        expect(onDropEnter).toHaveBeenCalledTimes(pageDownTargets.length + i + 1);
        expect(onDropEnter).toHaveBeenLastCalledWith({
          type: 'dropenter',
          x: 0,
          y: 0,
          target: pageUpTargets[i]
        });
      }
    });

    it('should skip invalid targets with PageUp and PageDown', () => {
      let onDropEnter = jest.fn();
      let onDragExit = jest.fn();
      let onDrop = jest.fn();
      let items = [];
      for (let i = 0; i < 6; i++) {
        items.push({id: '' + i, type: 'item', text: `Item ${i}`});
      }
      let getDropOperation = (target) => target.type === 'item' && target.dropPosition === 'on' && target.key !== '4' && target.key !== '1' ? 'move' : 'cancel';
      let tree = render(<>
        <Draggable />
        <DroppableGridExample items={items} getDropOperation={getDropOperation} onDropEnter={onDropEnter} onDropExit={onDragExit} onDrop={onDrop} />
      </>);

      let draggable = tree.getByText('Drag me');
      let grid = tree.getByRole('grid');
      let cells = within(grid).getAllByRole('gridcell');
      expect(cells).toHaveLength(6);

      userEvent.tab();
      expect(document.activeElement).toBe(draggable);

      pressKey('Enter');
      act(() => jest.runAllTimers());

      cells = within(grid).getAllByRole('gridcell');
      expect(cells).toHaveLength(4);

      let pageDownTargets = [
        {type: 'item', key: '0', dropPosition: 'on'},
        {type: 'item', key: '2', dropPosition: 'on'},
        // skip 4
        {type: 'item', key: '5', dropPosition: 'on'}
      ];

      for (let i = 0; i < pageDownTargets.length; i++) {
        if (i > 0) {
          pressKey('PageDown');

          expect(onDragExit).toHaveBeenCalledTimes(i);
          expect(onDragExit).toHaveBeenLastCalledWith({
            type: 'dropexit',
            x: 0,
            y: 0,
            target: pageDownTargets[i - 1]
          });
        }

        expect(onDropEnter).toHaveBeenCalledTimes(i + 1);
        expect(onDropEnter).toHaveBeenLastCalledWith({
          type: 'dropenter',
          x: 0,
          y: 0,
          target: pageDownTargets[i]
        });
      }

      let pageUpTargets = [
        {type: 'item', key: '3', dropPosition: 'on'},
        // skip 1
        {type: 'item', key: '0', dropPosition: 'on'}
      ];

      for (let i = 0; i < pageUpTargets.length; i++) {
        pressKey('PageUp');
        expect(onDragExit).toHaveBeenCalledTimes(pageDownTargets.length + i);
        expect(onDragExit).toHaveBeenLastCalledWith({
          type: 'dropexit',
          x: 0,
          y: 0,
          target: i === 0 ? pageDownTargets[pageDownTargets.length - 1] : pageUpTargets[i - 1]
        });

        expect(onDropEnter).toHaveBeenCalledTimes(pageDownTargets.length + i + 1);
        expect(onDropEnter).toHaveBeenLastCalledWith({
          type: 'dropenter',
          x: 0,
          y: 0,
          target: pageUpTargets[i]
        });
      }
    });

    it('should skip invalid targets at edges with PageUp and PageDown', () => {
      let onDropEnter = jest.fn();
      let onDragExit = jest.fn();
      let onDrop = jest.fn();
      let items = [];
      for (let i = 0; i < 6; i++) {
        items.push({id: '' + i, type: 'item', text: `Item ${i}`});
      }
      let getDropOperation = (target) => target.type === 'item' && target.dropPosition === 'on' && target.key !== '0' && target.key !== '5' ? 'move' : 'cancel';
      let tree = render(<>
        <Draggable />
        <DroppableGridExample items={items} getDropOperation={getDropOperation} onDropEnter={onDropEnter} onDropExit={onDragExit} onDrop={onDrop} />
      </>);

      let draggable = tree.getByText('Drag me');
      let grid = tree.getByRole('grid');
      let cells = within(grid).getAllByRole('gridcell');
      expect(cells).toHaveLength(6);

      userEvent.tab();
      expect(document.activeElement).toBe(draggable);

      pressKey('Enter');
      act(() => jest.runAllTimers());

      cells = within(grid).getAllByRole('gridcell');
      expect(cells).toHaveLength(4);

      let pageDownTargets = [
        {type: 'item', key: '1', dropPosition: 'on'},
        {type: 'item', key: '3', dropPosition: 'on'},
        // skip 5
        {type: 'item', key: '4', dropPosition: 'on'}
      ];

      for (let i = 0; i < pageDownTargets.length; i++) {
        if (i > 0) {
          pressKey('PageDown');

          expect(onDragExit).toHaveBeenCalledTimes(i);
          expect(onDragExit).toHaveBeenLastCalledWith({
            type: 'dropexit',
            x: 0,
            y: 0,
            target: pageDownTargets[i - 1]
          });
        }

        expect(onDropEnter).toHaveBeenCalledTimes(i + 1);
        expect(onDropEnter).toHaveBeenLastCalledWith({
          type: 'dropenter',
          x: 0,
          y: 0,
          target: pageDownTargets[i]
        });
      }

      let pageUpTargets = [
        {type: 'item', key: '2', dropPosition: 'on'},
        // skip 0
        {type: 'item', key: '1', dropPosition: 'on'}
      ];

      for (let i = 0; i < pageUpTargets.length; i++) {
        pressKey('PageUp');
        expect(onDragExit).toHaveBeenCalledTimes(pageDownTargets.length + i);
        expect(onDragExit).toHaveBeenLastCalledWith({
          type: 'dropexit',
          x: 0,
          y: 0,
          target: i === 0 ? pageDownTargets[pageDownTargets.length - 1] : pageUpTargets[i - 1]
        });

        expect(onDropEnter).toHaveBeenCalledTimes(pageDownTargets.length + i + 1);
        expect(onDropEnter).toHaveBeenLastCalledWith({
          type: 'dropenter',
          x: 0,
          y: 0,
          target: pageUpTargets[i]
        });
      }
    });

    it('should default to dropping after the last focused item if any', () => {
      let onDrop = jest.fn();
      let tree = render(<>
        <Draggable />
        <DroppableGridExample onDrop={onDrop} />
      </>);

      let draggable = tree.getByText('Drag me');
      let grid = tree.getByRole('grid');
      let cells = within(grid).getAllByRole('gridcell');
      expect(cells).toHaveLength(3);

      userEvent.tab();
      userEvent.tab();
      expect(document.activeElement).toBe(cells[0]);

      pressKey('ArrowDown');
      expect(document.activeElement).toBe(cells[1]);

      userEvent.tab({shift: true});
      expect(document.activeElement).toBe(draggable);

      pressKey('Enter');
      act(() => jest.runAllTimers());

      expect(document.activeElement).toHaveAttribute('aria-label', 'Insert between Two and Three');
    });

    it('should default to dropping after the selected items if any', () => {
      let onDrop = jest.fn();
      let tree = render(<>
        <Draggable />
        <DroppableGridExample onDrop={onDrop} />
      </>);

      let draggable = tree.getByText('Drag me');
      let grid = tree.getByRole('grid');
      let cells = within(grid).getAllByRole('gridcell');
      let rows = within(grid).getAllByRole('row');
      expect(cells).toHaveLength(3);

      userEvent.tab();
      userEvent.tab();
      pressKey(' ');
      expect(document.activeElement).toBe(cells[0]);
      expect(rows[0]).toHaveAttribute('aria-selected', 'true');

      pressKey('ArrowDown');
      pressKey('ArrowDown');
      pressKey(' ');
      expect(document.activeElement).toBe(cells[2]);
      expect(rows[2]).toHaveAttribute('aria-selected', 'true');

      pressKey('ArrowUp');
      pressKey(' ');
      expect(document.activeElement).toBe(cells[1]);
      expect(rows[1]).toHaveAttribute('aria-selected', 'true');

      userEvent.tab({shift: true});
      expect(document.activeElement).toBe(draggable);

      pressKey('Enter');
      act(() => jest.runAllTimers());

      expect(document.activeElement).toHaveAttribute('aria-label', 'Insert after Three');
    });

    it('should default to before the selected items if the last focused item is the first selected item', () => {
      let onDrop = jest.fn();
      let tree = render(<>
        <Draggable />
        <DroppableGridExample onDrop={onDrop} />
      </>);

      let draggable = tree.getByText('Drag me');
      let grid = tree.getByRole('grid');
      let cells = within(grid).getAllByRole('gridcell');
      let rows = within(grid).getAllByRole('row');
      expect(cells).toHaveLength(3);

      userEvent.tab();
      userEvent.tab();
      expect(document.activeElement).toBe(cells[0]);

      pressKey('ArrowDown');
      pressKey('ArrowDown');
      pressKey('ArrowDown');
      pressKey(' ');
      expect(document.activeElement).toBe(cells[2]);
      expect(rows[2]).toHaveAttribute('aria-selected', 'true');

      pressKey('ArrowUp');
      pressKey(' ');
      expect(document.activeElement).toBe(cells[1]);
      expect(rows[1]).toHaveAttribute('aria-selected', 'true');

      userEvent.tab({shift: true});
      expect(document.activeElement).toBe(draggable);

      pressKey('Enter');
      act(() => jest.runAllTimers());

      expect(document.activeElement).toHaveAttribute('aria-label', 'Insert between One and Two');
    });

    it('should default to on the first selected item if the last focused item is the first selected item and only dropping on items is allowed', () => {
      let onDrop = jest.fn();
      let getDropOperation = (target) => target.dropPosition !== 'on' ? 'cancel' : 'move';
      let tree = render(<>
        <Draggable />
        <DroppableGridExample onDrop={onDrop} getDropOperation={getDropOperation} />
      </>);

      let draggable = tree.getByText('Drag me');
      let grid = tree.getByRole('grid');
      let cells = within(grid).getAllByRole('gridcell');
      let rows = within(grid).getAllByRole('row');
      expect(cells).toHaveLength(3);

      userEvent.tab();
      userEvent.tab();
      expect(document.activeElement).toBe(cells[0]);

      pressKey('ArrowDown');
      pressKey('ArrowDown');
      pressKey('ArrowDown');
      pressKey(' ');
      expect(document.activeElement).toBe(cells[2]);
      expect(rows[2]).toHaveAttribute('aria-selected', 'true');

      pressKey('ArrowUp');
      pressKey(' ');
      expect(document.activeElement).toBe(cells[1]);
      expect(rows[1]).toHaveAttribute('aria-selected', 'true');

      userEvent.tab({shift: true});
      expect(document.activeElement).toBe(draggable);

      pressKey('Enter');
      act(() => jest.runAllTimers());

      expect(document.activeElement).toHaveAttribute('aria-label', 'Drop on Two');
    });

    it('should default to on the last selected item when only dropping on items is allowed', () => {
      let onDrop = jest.fn();
      let getDropOperation = (target) => target.dropPosition !== 'on' ? 'cancel' : 'move';
      let tree = render(<>
        <Draggable />
        <DroppableGridExample onDrop={onDrop} getDropOperation={getDropOperation} />
      </>);

      let draggable = tree.getByText('Drag me');
      let grid = tree.getByRole('grid');
      let cells = within(grid).getAllByRole('gridcell');
      let rows = within(grid).getAllByRole('row');
      expect(cells).toHaveLength(3);

      userEvent.tab();
      userEvent.tab();
      pressKey(' ');
      expect(document.activeElement).toBe(cells[0]);
      expect(rows[0]).toHaveAttribute('aria-selected', 'true');

      pressKey('ArrowDown');
      pressKey('ArrowDown');
      pressKey(' ');
      expect(document.activeElement).toBe(cells[2]);
      expect(rows[2]).toHaveAttribute('aria-selected', 'true');

      pressKey('ArrowUp');
      pressKey(' ');
      expect(document.activeElement).toBe(cells[1]);
      expect(rows[1]).toHaveAttribute('aria-selected', 'true');

      userEvent.tab({shift: true});
      expect(document.activeElement).toBe(draggable);

      pressKey('Enter');
      act(() => jest.runAllTimers());

      expect(document.activeElement).toHaveAttribute('aria-label', 'Drop on Three');
    });
  });

  describe('screen reader', () => {
    beforeEach(() => {
      // reset focus visible state
      fireEvent.blur(window);
    });

    afterEach(() => {
      fireEvent.keyDown(document.body, {key: 'Escape'});
      fireEvent.keyUp(document.body, {key: 'Escape'});
    });

    it('should perform basic drag and drop', async () => {
      let onDrop = jest.fn();
      let tree = render(<>
        <Draggable />
        <DroppableGridExample onDrop={onDrop} />
      </>);

      let draggable = tree.getByText('Drag me');
      let grid = tree.getByRole('grid');
      let cells = within(grid).getAllByRole('gridcell');
      expect(cells).toHaveLength(3);

      userEvent.tab();
      expect(document.activeElement).toBe(draggable);

      fireEvent.focus(draggable);
      fireEvent.click(draggable);
      act(() => jest.runAllTimers());

      cells = within(grid).getAllByRole('gridcell');
      expect(cells).toHaveLength(7);

      act(() => within(cells[3]).getByRole('button').focus());
      fireEvent.click(within(cells[3]).getByRole('button'));
      expect(onDrop).toHaveBeenCalledTimes(1);
      expect(onDrop).toHaveBeenCalledWith({
        type: 'drop',
        x: 50,
        y: 75,
        target: {type: 'item', key: '2', dropPosition: 'before'},
        dropOperation: 'move',
        items: [
          {
            kind: 'text',
            types: new Set(['text/plain']),
            getText: expect.any(Function)
          }
        ]
      });

      await waitFor(() => expect(within(grid).getAllByRole('gridcell')).toHaveLength(4));
      cells = within(grid).getAllByRole('gridcell');
      expect(cells.map(cell => cell.textContent)).toEqual(['One', 'hello world', 'Two', 'Three']);

      expect(await onDrop.mock.calls[0][0].items[0].getText('text/plain')).toBe('hello world');
    });

    it('should add descriptions to each item', () => {
      let tree = render(<>
        <Draggable />
        <DroppableGridExample />
      </>);

      let draggable = tree.getByText('Drag me');
      let grid = tree.getByRole('grid');
      expect(grid).not.toHaveAttribute('aria-describedby');

      let cells = within(grid).getAllByRole('gridcell');
      expect(cells).toHaveLength(3);

      fireEvent.focus(draggable);
      fireEvent.click(draggable);
      act(() => jest.runAllTimers());

      cells = within(grid).getAllByRole('gridcell');
      expect(cells).toHaveLength(7);

      for (let cell of cells) {
        if (!cell.getAttribute('aria-roledescription')) {
          continue;
        }

        expect(cell).toHaveAttribute('aria-describedby');
        expect(document.getElementById(cell.getAttribute('aria-describedby'))).toHaveTextContent('Click to drop.');
      }
    });

    it('should show insertion indicators', () => {
      let tree = render(<>
        <Draggable />
        <DroppableGridExample />
      </>);

      let draggable = tree.getByText('Drag me');
      let grid = tree.getByRole('grid');
      let cells = within(grid).getAllByRole('gridcell');
      expect(cells).toHaveLength(3);

      fireEvent.focus(draggable);
      fireEvent.click(draggable);
      act(() => jest.runAllTimers());

      cells = within(grid).getAllByRole('gridcell');
      expect(cells).toHaveLength(7);

      let dropIndicator = within(cells[0]).getByRole('button', {hidden: true});
      expect(dropIndicator).toHaveAttribute('aria-roledescription', 'drop indicator');
      expect(dropIndicator).toHaveAttribute('aria-label', 'Drop on');
      expect(dropIndicator).toHaveAttribute('id');
      expect(grid).toHaveAttribute('id');
      expect(dropIndicator).toHaveAttribute('aria-labelledby', `${dropIndicator.id} ${grid.id}`);
      expect(dropIndicator).toHaveAttribute('tabIndex', '-1');
      expect(dropIndicator).toHaveAttribute('aria-describedby');
      expect(document.getElementById(dropIndicator.getAttribute('aria-describedby'))).toHaveTextContent('Click to drop.');

      dropIndicator = within(cells[1]).getByRole('button', {hidden: true});
      expect(dropIndicator).toHaveAttribute('aria-roledescription', 'drop indicator');
      expect(dropIndicator).toHaveAttribute('aria-label', 'Insert before One');
      expect(dropIndicator).not.toHaveAttribute('aria-labelledby');
      expect(dropIndicator).toHaveAttribute('tabIndex', '-1');
      expect(dropIndicator).toHaveAttribute('aria-describedby');
      expect(document.getElementById(dropIndicator.getAttribute('aria-describedby'))).toHaveTextContent('Click to drop.');

      expect(cells[2]).toHaveTextContent('One');

      dropIndicator = within(cells[3]).getByRole('button', {hidden: true});
      expect(dropIndicator).toHaveAttribute('aria-roledescription', 'drop indicator');
      expect(dropIndicator).toHaveAttribute('aria-label', 'Insert between One and Two');
      expect(dropIndicator).not.toHaveAttribute('aria-labelledby');
      expect(dropIndicator).toHaveAttribute('tabIndex', '-1');
      expect(dropIndicator).toHaveAttribute('aria-describedby');
      expect(document.getElementById(dropIndicator.getAttribute('aria-describedby'))).toHaveTextContent('Click to drop.');

      dropIndicator = within(cells[4]).getByRole('button', {hidden: true});
      expect(dropIndicator).toHaveAttribute('aria-roledescription', 'drop indicator');
      expect(dropIndicator).toHaveAttribute('aria-label', 'Insert between Two and Three');
      expect(dropIndicator).not.toHaveAttribute('aria-labelledby');
      expect(dropIndicator).toHaveAttribute('tabIndex', '-1');
      expect(dropIndicator).toHaveAttribute('aria-describedby');
      expect(document.getElementById(dropIndicator.getAttribute('aria-describedby'))).toHaveTextContent('Click to drop.');

      expect(cells[5]).toHaveTextContent('Three');

      dropIndicator = within(cells[6]).getByRole('button', {hidden: true});
      expect(dropIndicator).toHaveAttribute('aria-roledescription', 'drop indicator');
      expect(dropIndicator).toHaveAttribute('aria-label', 'Insert after Three');
      expect(dropIndicator).not.toHaveAttribute('aria-labelledby');
      expect(dropIndicator).toHaveAttribute('tabIndex', '-1');
      expect(dropIndicator).toHaveAttribute('aria-describedby');
      expect(document.getElementById(dropIndicator.getAttribute('aria-describedby'))).toHaveTextContent('Click to drop.');
    });

    it('should hide items that do not accept the drop', () => {
      let tree = render(<>
        <Draggable />
        <DroppableGridExample />
      </>);

      let draggable = tree.getByText('Drag me');
      let grid = tree.getByRole('grid');
      let cells = within(grid).getAllByRole('gridcell');
      expect(cells).toHaveLength(3);

      fireEvent.focus(draggable);
      fireEvent.click(draggable);
      act(() => jest.runAllTimers());

      cells = within(grid).getAllByRole('gridcell', {hidden: true});
      expect(cells).toHaveLength(8);

      expect(cells[4]).toHaveTextContent('Two');
      expect(cells[4]).toHaveAttribute('aria-hidden', 'true');
    });
  });
});
