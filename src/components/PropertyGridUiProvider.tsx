/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *--------------------------------------------------------------------------------------------*/

import {
  AncestorsNavigationControls,
  CopyPropertyTextContextMenuItem,
  createPropertyGrid,
  ShowHideNullValuesSettingsMenuItem,
} from "@itwin/property-grid-react";

export const propertyGridUiProvider = {
  id: "PropertyGridUIProvider",
  getWidgets: () => [
    createPropertyGrid({
      autoExpandChildCategories: true,
      ancestorsNavigationControls: (props) => (
        <AncestorsNavigationControls {...props} />
      ),
      contextMenuItems: [
        (props) => <CopyPropertyTextContextMenuItem {...props} />,
      ],
      settingsMenuItems: [
        (props) => (
          <ShowHideNullValuesSettingsMenuItem {...props} persist={true} />
        ),
      ],
    }),
  ],
};
