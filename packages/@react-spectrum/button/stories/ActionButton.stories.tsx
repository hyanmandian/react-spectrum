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
import {ActionButton} from '../';
import Add from '@spectrum-icons/workflow/Add';
import {Flex} from '@react-spectrum/layout';
import React, {useRef, useState} from 'react';
import {storiesOf} from '@storybook/react';
import {Text} from '@react-spectrum/text';

storiesOf('Button/ActionButton', module)
  .addParameters({providerSwitcher: {status: 'positive'}})
  .add(
    'default',
    () => render()
  )
  .add(
    'icon',
    () => (
      <Flex gap="size-100">
        <ActionButton
          onPress={action('press')}
          onPressStart={action('pressstart')}
          onPressEnd={action('pressend')}>
          <Add />
          <Text>Default</Text>
        </ActionButton>
        <ActionButton
          onPress={action('press')}
          onPressStart={action('pressstart')}
          onPressEnd={action('pressend')}
          isDisabled>
          <Text>Disabled</Text>
          <Add />
        </ActionButton>
      </Flex>
    )
  )
  .add(
    'icon only',
    () => (
      <Flex gap="size-100">
        <ActionButton
          onPress={action('press')}
          onPressStart={action('pressstart')}
          onPressEnd={action('pressend')}>
          <Add />
        </ActionButton>
        <ActionButton
          onPress={action('press')}
          onPressStart={action('pressstart')}
          onPressEnd={action('pressend')}
          isDisabled>
          <Add />
        </ActionButton>
      </Flex>
    )
  )
  .add(
    'isQuiet',
    () => render({isQuiet: true})
  )
  .add(
    'autoFocus',
    () => render({autoFocus: true})
  )
  .add(
    'Safari: press start not fired after press end on disabled form element',
    () => <DisabledButtonBug />
  );

function render(props = {}) {
  return (
    <Flex gap="size-100">
      <ActionButton
        onPress={action('press')}
        onPressStart={action('pressstart')}
        onPressEnd={action('pressend')}
        {...props}>
        Default
      </ActionButton>
      <ActionButton
        onPress={action('press')}
        onPressStart={action('pressstart')}
        onPressEnd={action('pressend')}
        isDisabled
        {...props}>
        Disabled
      </ActionButton>
    </Flex>
  );
}

// https://codesandbox.io/s/eloquent-herschel-pgwci?file=/index.html
function DisabledButtonBug() {
  let [fooDisabled, setFooDisabled] = useState<boolean>();
  let fooPressStart = () => {
    console.log('press start foo');
    setFooDisabled(true);
  };
  let fooPressEnd = () => {
    console.log('press end foo');
  };


  let barPressStart = () => {
    console.log('press start bar');
  };
  let barPressEnd = () => {
    console.log('press end bar');
  };
  return (
    <Flex>
      <ActionButton isDisabled={fooDisabled} onPressStart={fooPressStart} onPress={fooPressEnd}>Foo</ActionButton>
      <ActionButton onPressStart={barPressStart} onPress={barPressEnd}>Bar</ActionButton>
    </Flex>
  );
}


