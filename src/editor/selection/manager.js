import Selection from 'editor/selection/collection';
import { TypeCallbackBus } from 'common/busses';
import { ApplicationFragment } from 'common/application/fragments';
import { SELECT } from 'editor/selection/events';

export const fragment = ApplicationFragment.create({
  ns: 'application/selector',
  initialize: initialize,
});

function initialize(app) {
  app.busses.push(TypeCallbackBus.create(SELECT, onSelectEvent));

  app.selection = [];

  function onSelectEvent(event) {
    var { items, keepPreviousSelection, toggle } = event;
    var currentSelection = app.selection || [];
    var newSelection;

    if (!items.length) {
      return app.setProperties({ selection: [] });
    }

    const type = items[0].type;

    items.forEach(function (item) {
      if (item.type !== type) throw new Error('Cannot select multiple items with different types');
    });

    const selectionCollectionFragment = app.fragments.query(`selection-collections/${type}`);

    if (selectionCollectionFragment) {
      newSelection = selectionCollectionFragment.create();
    } else {
      newSelection = Selection.create();
    }


    if (keepPreviousSelection && currentSelection.constructor == newSelection.constructor) {
      newSelection.push(...currentSelection);
    }

    for (const item of items) {
      const i = newSelection.indexOf(item);

      // toggle off
      if (~i) {
        if (toggle)  {
          newSelection.splice(i, 1);
        }
      } else {
        newSelection.push(item);
      }
    }

    app.setProperties({ selection: newSelection });
  }
}