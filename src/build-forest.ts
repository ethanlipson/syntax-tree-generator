export class TreeNode {
  name: string;
  children: TreeNode[];
  attributes: Record<string, string>;

  constructor(name: string, children: TreeNode[]) {
    this.name = name;
    this.children = children;
    this.attributes = {};
  }

  toString(): string {
    return this.children.length === 0
      ? `${this.name}`
      : `${this.name}(${this.children
          .map(child => child.toString())
          .join(', ')})`;
  }

  copy(): TreeNode {
    return new TreeNode(
      this.name,
      this.children.map(child => child.copy())
    );
  }
}

export default function buildForest(
  rules: [string, string[]][],
  terminals: string[],
  sentence: string[]
): TreeNode[] {
  // Rule index, dot position, start position, sibling/child index
  const stateSets = [[[0, 0, 0]]];
  for (let i = 1; i < sentence.length + 1; i++) {
    stateSets.push([]);
  }

  for (let k = 0; k < sentence.length + 1; k++) {
    let currentStateIndex = 0;

    while (true) {
      if (currentStateIndex === stateSets[k].length) {
        break;
      }

      const [ruleId, dotIdx, startIdx] = stateSets[k][currentStateIndex];

      if (dotIdx === rules[ruleId][1].length) {
        // End of rule
        for (const state of stateSets[startIdx]) {
          if (
            state[1] != rules[state[0]][1].length &&
            rules[state[0]][1][state[1]] === rules[ruleId][0]
          ) {
            const newState = [state[0], state[1] + 1, state[2]];
            if (!stateSets[k].some(s => s.every((v, i) => v === newState[i]))) {
              stateSets[k].push(newState);
            }
          }
        }
      } else if (!terminals.includes(rules[ruleId][1][dotIdx])) {
        // Non-terminal
        for (
          let predictedRuleId = 0;
          predictedRuleId < rules.length;
          predictedRuleId++
        ) {
          const rule = rules[predictedRuleId];
          if (rule[0] == rules[ruleId][1][dotIdx]) {
            const newState = [predictedRuleId, 0, k];
            if (!stateSets[k].some(s => s.every((v, i) => v === newState[i]))) {
              stateSets[k].push(newState);
            }
          }
        }
      } else if (terminals.includes(rules[ruleId][1][dotIdx])) {
        // Terminal
        const newState = [ruleId, dotIdx + 1, startIdx];
        if (
          k + 1 < stateSets.length &&
          sentence[k] === rules[ruleId][1][dotIdx]
        ) {
          if (
            !stateSets[k + 1].some(s => s.every((v, i) => v === newState[i]))
          ) {
            stateSets[k + 1].push(newState);
          }
        }
      }

      currentStateIndex += 1;
    }
  }

  const isValid = stateSets[sentence.length].some(
    state => state[0] === 0 && state[1] === rules[0][1].length && state[2] === 0
  );

  if (!isValid) {
    return [];
  }

  const completedStateSets = stateSets.map(stateSet =>
    stateSet.filter(state => state[1] == rules[state[0]][1].length)
  );

  const transposedStateSets = Array(sentence.length)
    .fill(0)
    .map(() => [] as [number, number][]);
  for (let k = 0; k < completedStateSets.length; k++) {
    const stateSet = completedStateSets[k];
    for (const state of stateSet) {
      transposedStateSets[state[2]].push([state[0], k]);
    }
  }

  function buildTreeRecursive(
    start: number,
    idxInSet: number,
    end: number
  ): [TreeNode, number][] {
    function findSiblingsRecursive(
      ruleId: number,
      dotIdx: number,
      start: number,
      end: number
    ): [TreeNode[], number][] {
      if (dotIdx == rules[ruleId][1].length || start >= end) {
        return [[[], 0]];
      }

      const targetSymbol = rules[ruleId][1][dotIdx];
      if (terminals.includes(targetSymbol)) {
        const sibling = new TreeNode(targetSymbol, []);
        const remainingSiblingsList = findSiblingsRecursive(
          ruleId,
          dotIdx + 1,
          start + 1,
          end
        );
        return remainingSiblingsList.map(
          ([remainingSiblings, remainingSiblingsWidth]) => {
            return [
              [sibling.copy(), ...remainingSiblings.map(s => s.copy())],
              1 + remainingSiblingsWidth,
            ];
          }
        );
      } else {
        const possibleSiblings = [] as [TreeNode[], number][];
        for (
          let idxInSet = 0;
          idxInSet < transposedStateSets[start].length;
          idxInSet++
        ) {
          const state = transposedStateSets[start][idxInSet];
          if (rules[state[0]][0] === targetSymbol) {
            const siblingList = buildTreeRecursive(start, idxInSet, state[1]);
            for (const [sibling, siblingWidth] of siblingList) {
              if (sibling.children.length !== rules[state[0]][1].length) {
                continue;
              }

              const remainingSiblingsList = findSiblingsRecursive(
                ruleId,
                dotIdx + 1,
                start + siblingWidth,
                end
              );
              for (const [
                remainingSiblings,
                remainingSiblingsWidth,
              ] of remainingSiblingsList) {
                if (siblingWidth + remainingSiblingsWidth == end - start) {
                  possibleSiblings.push([
                    [sibling.copy(), ...remainingSiblings.map(s => s.copy())],
                    siblingWidth + remainingSiblingsWidth,
                  ]);
                }
              }
            }
          }
        }

        return possibleSiblings;
      }
    }

    const possibleTrees = findSiblingsRecursive(
      transposedStateSets[start][idxInSet][0],
      0,
      start,
      end
    );
    return possibleTrees.map(possibleTree => [
      new TreeNode(
        rules[transposedStateSets[start][idxInSet][0]][0],
        possibleTree[0]
      ),
      possibleTree[1],
    ]);
  }

  return buildTreeRecursive(
    0,
    transposedStateSets[0].findIndex(
      ([ruleId, end]) => ruleId === 0 && end === sentence.length
    ),
    sentence.length
  ).map(([tree, _]) => tree);
}
