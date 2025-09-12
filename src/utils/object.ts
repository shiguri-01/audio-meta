import { isEqual } from "lodash";

/**
 * プレーンオブジェクトか否か
 */
export const isPlainObject = (
  value: unknown,
): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value); // nullは"object"判定されるので除外

/**
 * オブジェクトの差分を作成する
 */
export const createDiff = <T extends object>(
  changes: T,
  base: T,
): Partial<T> => {
  const diff: Partial<T> = {};
  for (const key in changes) {
    // オブジェクト自身が持つプロパティのみ処理
    if (!Object.hasOwn(changes, key)) continue;

    const typedKey = key as keyof T;
    const changeValue = changes[typedKey];
    const baseValue = base[typedKey];

    // 値がプレーンオブジェクトの場合は再帰的に差分を計算
    if (isPlainObject(changeValue) && isPlainObject(baseValue)) {
      const nestedDiff = createDiff(changeValue, baseValue);
      if (Object.keys(nestedDiff).length > 0) {
        diff[typedKey] = nestedDiff as T[keyof T];
      }
    }
    // プリミティブ値・配列の場合は単純比較
    else if (!isEqual(changeValue, baseValue)) {
      diff[typedKey] = changeValue;
    }
  }
  return diff;
};

/**
 * オブジェクトが空（実質的な値を含まない）か否かをチェックする
 *
 * undefinedや空オブジェクトのみで構成されている場合にtrueを返す
 *
 * @param obj チェック対象のオブジェクト
 * @returns オブジェクトが空の場合true
 */
export const isEmpty = <T extends object>(obj: T): boolean => {
  if (Object.keys(obj).length === 0) return true;

  return Object.entries(obj).every(([_key, value]) => {
    if (isPlainObject(value)) {
      // プレーンオブジェクトの場合は再帰的にチェック
      return isEmpty(value);
    }
    if (value === undefined) {
      return true;
    }
    return false;
  });
};
