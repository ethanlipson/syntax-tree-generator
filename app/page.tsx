'use client';

import { useEffect, useRef, useState } from 'react';
import { Input, Button, Stack, Text } from '@chakra-ui/react';
import buildForest, { TreeNode } from '@/src/build-forest';
import fastCartesian from 'fast-cartesian';
import Tree from 'react-d3-tree';
import { ArrowBackIcon, ArrowForwardIcon } from '@chakra-ui/icons';

const rules = [
  ['S', ['NP', 'VP']],
  ['NP', ['N']],
  ['NP', ['Det', 'N']],
  ['NP', ['AP', 'N']],
  ['NP', ['Det', 'AP', 'N']],
  ['NP', ['N', 'PP']],
  ['NP', ['Det', 'N', 'PP']],
  ['NP', ['AP', 'N', 'PP']],
  ['NP', ['Det', 'AP', 'N', 'PP']],
  ['VP', ['V']],
  ['VP', ['V', 'NP']],
  ['VP', ['V', 'CP']],
  ['VP', ['V', 'PP']],
  ['VP', ['V', 'NP', 'PP']],
  ['VP', ['V', 'CP', 'PP']],
  ['CP', ['C', 'S']],
  ['AP', ['Adv', 'A']],
  ['AP', ['A']],
  ['PP', ['P', 'NP']],
] as [string, string[]][];

const terminals = ['Det', 'N', 'V', 'C', 'Adv', 'A', 'P'];

function insertWords(tree: TreeNode, words: string[]) {
  let index = 0;

  function insertWordsRecursive(tree: TreeNode) {
    if (tree.children.length > 0) {
      for (const child of tree.children) {
        insertWordsRecursive(child);
      }
    } else {
      tree.attributes['Type'] = tree.name;
      tree.name = words[index];
      index++;
    }
  }

  insertWordsRecursive(tree);
}

export default function Home() {
  const [sentence, setSentence] = useState('');
  const [trees, setTrees] = useState<TreeNode[]>([]);
  const [treeSelection, setTreeSelection] = useState(0);

  async function parse() {
    const partsOfSpeechResponse = await fetch('/api/parts-of-speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sentence }),
    });
    const partsOfSpeech = (await partsOfSpeechResponse.json()).partsOfSpeech
      .partsOfSpeech as string[][];

    const posWithGuesses = partsOfSpeech.map(pos =>
      pos.length === 0 ? ['N', 'V', 'A', 'Adv'] : pos
    );
    const posCartesian = fastCartesian(posWithGuesses);

    const newTrees = [];
    for (const posGuess of posCartesian) {
      const forest = buildForest(rules, terminals, posGuess);
      for (const tree of forest) {
        insertWords(tree, sentence.split(' '));
        newTrees.push(tree);
      }
    }

    setTrees(newTrees);
    setTreeSelection(0);
  }

  const arrowButtons = (
    <Stack spacing={2} direction="row">
      <Button
        className="flex-grow"
        onClick={() =>
          setTreeSelection(
            treeSelection => (treeSelection - 1 + trees.length) % trees.length
          )
        }
      >
        <ArrowBackIcon />
      </Button>
      <Button
        className="flex-grow"
        onClick={() =>
          setTreeSelection(treeSelection => (treeSelection + 1) % trees.length)
        }
      >
        <ArrowForwardIcon />
      </Button>
    </Stack>
  );

  return (
    <Stack spacing={4} p={4} direction="column" h="100svh">
      <div id="treeWrapper" className="w-full h-full">
        {trees.length > 0 ? (
          <Tree
            data={trees[treeSelection]}
            orientation="vertical"
            translate={{ x: window.innerWidth / 2, y: window.innerHeight / 10 }}
            zoom={0.5}
          />
        ) : null}
      </div>
      <Stack spacing={4} direction="row">
        <Input
          value={sentence}
          onChange={e => setSentence(e.target.value)}
          placeholder="Enter a sentence"
          onKeyDown={e => {
            if (e.key === 'Enter') {
              (e.target as HTMLInputElement).blur();
              parse();
            }
          }}
        />
        <Button onClick={parse}>Parse</Button>
        <div className="hidden sm:block">
          {trees.length > 1 && arrowButtons}
        </div>
      </Stack>
      <div className="block sm:hidden">{trees.length > 1 && arrowButtons}</div>
    </Stack>
  );
}
