const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildSearchRegex = (value: string): RegExp => new RegExp(escapeRegex(value.trim()), 'i');

export default buildSearchRegex;
