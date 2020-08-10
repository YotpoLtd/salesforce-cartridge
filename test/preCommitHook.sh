echo "pre commit verify Lint"
npm run lint
echo "pre commit verify unit tests"
npm run test
echo "pre commit verify integration tests"
npm run test:integration
