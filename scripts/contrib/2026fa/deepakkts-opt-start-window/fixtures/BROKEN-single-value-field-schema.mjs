// Regression fixture: the first version of the schema learner, reduced to the
// part that was wrong. It learned ONE value field, from the sponsorship term, and
// used it for every term, so gates were written as { p: ... }. The real scorer
// reads gates from `factor`, ignored these, and defaulted both gates to 1.
// The emitted-key-name test must fail this file. Never import this outside tests.

export function buildRoleSingleField(example, terms) {
  const probe = example.roles[0].sponsorship;
  const valueField = ['value', 'p', 'probability', 'score'].find((f) => f in probe) || Object.keys(probe)[0];
  const role = {};
  for (const [term, payload] of Object.entries(terms)) {
    role[term] = { [valueField]: payload.value, source: payload.source };
  }
  return role;
}
