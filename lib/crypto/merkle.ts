import { sha256 } from "@/lib/crypto/hashing";

export type MerkleProofStep = {
  position: "left" | "right";
  hash: string;
};

export function buildMerkleTree(leaves: string[]) {
  if (leaves.length === 0) {
    return {
      root: "",
      levels: [[]] as string[][]
    };
  }

  const levels: string[][] = [leaves];
  let current = leaves;

  while (current.length > 1) {
    const next: string[] = [];
    for (let index = 0; index < current.length; index += 2) {
      const left = current[index];
      const right = current[index + 1] ?? current[index];
      next.push(sha256(`${left}:${right}`));
    }
    levels.push(next);
    current = next;
  }

  return {
    root: current[0],
    levels
  };
}

export function createMerkleProof(leaves: string[], targetLeaf: string) {
  const tree = buildMerkleTree(leaves);
  const index = leaves.findIndex((leaf) => leaf === targetLeaf);

  if (index === -1) {
    return [] as MerkleProofStep[];
  }

  const proof: MerkleProofStep[] = [];
  let currentIndex = index;

  for (let levelIndex = 0; levelIndex < tree.levels.length - 1; levelIndex += 1) {
    const level = tree.levels[levelIndex];
    const isRightNode = currentIndex % 2 === 1;
    const siblingIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;
    const siblingHash = level[siblingIndex] ?? level[currentIndex];

    proof.push({
      position: isRightNode ? "left" : "right",
      hash: siblingHash
    });

    currentIndex = Math.floor(currentIndex / 2);
  }

  return proof;
}

export function verifyMerkleProof(leafHash: string, proof: MerkleProofStep[], root: string) {
  let current = leafHash;

  for (const step of proof) {
    current =
      step.position === "left"
        ? sha256(`${step.hash}:${current}`)
        : sha256(`${current}:${step.hash}`);
  }

  return current === root;
}
