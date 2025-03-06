import { deepFlat } from '@daybrush/utils';
import * as React from 'react';
import Selecto, { ElementType } from 'react-selecto';
import Moveable, { MoveableTargetGroupsType } from 'react-moveable';
import { GroupManager, TargetList } from '@moveable/helper';

export default function App() {
  const groupManager = React.useMemo<GroupManager>(() => new GroupManager([]), []);
  const [targets, setTargets] = React.useState<MoveableTargetGroupsType>([]);

  const moveableRef = React.useRef<Moveable>(null);
  const selectoRef = React.useRef<Selecto>(null);

  const [cubes, setCubes] = React.useState<number[]>([0, 1, 2, 3, 4, 5]);
  const count = React.useRef<number>(6);

  const setSelectedTargets = React.useCallback((nextTargetes: MoveableTargetGroupsType) => {
    selectoRef.current!.setSelectedTargets(deepFlat(nextTargetes));
    setTargets(nextTargetes);
  }, []);

  const getGroups = (groupManager: GroupManager, elements: ElementType[]): (HTMLElement | SVGElement)[][] => {
    const existGroupChilds = groupManager.toChilds(elements).filter(v => v.depth === 2);
    const groupsHash = new Map();
    const groups: (HTMLElement | SVGElement)[][] = [];

    existGroupChilds.forEach(v => {
      if (!groupsHash.get(v.parent)) {
        groupsHash.set(v.parent, v.parent?.value.map(v => v.value));
      }
    })
    groupsHash.forEach((value) => {
      groups.push(value);
    });

    return groups;
  };

  // Set default groups
  React.useEffect(() => {
    const elements = selectoRef.current!.getSelectableElements();
    groupManager.set([], elements);
    groupManager.group([elements[0], elements[1]], true);
    groupManager.group([elements[3], elements[4]], true);
  }, []);


  return <div className='root'>
    <div className='container'>
      <button onClick={() => {
        /*
          Each time we add selectable items,
          we need to update the new items in the groupManager and ensure
          that the original group information remains intact.
        */
        cubes.push(count.current++);
        setCubes([...cubes]);

        setTimeout(() => {
          const elements = selectoRef.current!.getSelectableElements();
          const existGroups = getGroups(groupManager, elements);
          groupManager.set(existGroups, elements);
        }, 50);

      }}>Add Cube</button>
      <button onClick={() => {
        const nextGroup = groupManager.group(targets, true);

        if (nextGroup) {
          setTargets(nextGroup);
        }
      }}>Group</button>
      &nbsp;
      <button onClick={() => {
        const nextGroup = groupManager.ungroup(targets);

        if (nextGroup) {
          setTargets(nextGroup);
        }
      }}>Ungroup</button>
      <Moveable
        ref={moveableRef}
        draggable={true}
        rotatable={true}
        scalable={true}
        throttleDrag={1}
        throttleRotate={1}
        throttleResize={1}
        target={targets}
        onDrag={e => {
          e.target.style.transform = e.transform;
        }}
        onRenderGroup={e => {
          e.events.forEach(ev => {
            ev.target.style.cssText += ev.cssText;
          });
        }}
      ></Moveable>
      <Selecto
        ref={selectoRef}
        dragContainer={window}
        preventDefault
        selectableTargets={['.selectable']}
        hitRate={0}
        selectByClick={true}
        selectFromInside={false}
        toggleContinueSelect={['shift']}
        ratio={0}
        onDragStart={e => {
          const moveable = moveableRef.current!;
          const target = e.inputEvent.target;

          // Must have use deep flat
          const flatted = deepFlat(targets);
          if (target.tagName === 'BUTTON'
            || moveable.isMoveableElement(target)
            || flatted.some(t => t === target || t.contains(target))
          ) {
            e.stop();
          }

          e.data.startTargets = targets;
        }}
        onSelect={e => {
          const {
            isDragStartEnd,
            added,
            removed,
            inputEvent,
          } = e;
          const moveable = moveableRef.current!;

          if (isDragStartEnd) {
            inputEvent.preventDefault();

            moveable.waitToChangeTarget().then(() => {
              moveable.dragStart(inputEvent);
            });
          }
          let nextChilds: TargetList;

          if (isDragStartEnd) {
            nextChilds = groupManager.selectCompletedChilds(targets, added, removed);
          } else {
            nextChilds = groupManager.selectSameDepthChilds(targets, added, removed);
          }

          //e.currentTarget.setSelectedTargets(nextChilds.flatten());
          setSelectedTargets(nextChilds.targets());
        }}
      />
      <div className='elements selecto-area'>
        {cubes.map(i => <div className='cube selectable' key={i}>{i}</div>)}
      </div>
      <div className='empty elements'></div>
    </div>
  </div>;
}
