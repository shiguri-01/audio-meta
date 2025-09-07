const getAriaDescribedBy = (element: HTMLElement): string[] =>
  (element.getAttribute("aria-describedby")?.trim() ?? "")
    .split(/\s+/)
    .filter(Boolean); // 空文字などを除去

const setAriaDescribedBy = (element: HTMLElement, ids: string[]): void => {
  if (ids.length > 0) {
    element.setAttribute("aria-describedby", ids.join(" "));
  } else {
    element.removeAttribute("aria-describedby");
  }
};

/**
 * aria-describedby属性に新しいIDを追加する
 */
export const addAriaDescribedBy = (element: HTMLElement, id: string): void => {
  const ids = getAriaDescribedBy(element);
  if (!ids.includes(id)) {
    ids.push(id);
  }
  setAriaDescribedBy(element, ids);
};

/**
 * aria-describedby属性から指定されたIDを削除する
 */
export const removeAriaDescribedBy = (
  element: HTMLElement,
  id: string,
): void => {
  const newIds = getAriaDescribedBy(element).filter((token) => token !== id);
  setAriaDescribedBy(element, newIds);
};
