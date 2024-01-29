To run your benchmark in the cluster place it in the relevant folder under tests/<test_name>

To run you should be logged in the dev kubernetes cluster.
It's deploying this in k6-operator namespace

make deploy <test_name>
make run <test_name>

Make sure that you have k6 definition according to your requirement. You can check other tests for example how this looks like.
You can provide customer serviceaccount and other parameters for your tests (check run.yaml inside example), but you cannot change name and configmap name as it's automatically generated during make run.
Refer to https://github.com/grafana/k6-operator/blob/main/README.md#executing-tests for other variables that can be handy. One note that parallelism with static load will distribute it across different pods, so if you have 200 rps and parallelism 2 each of them will do 100 rps.

Right now this support only one file test that has name of main.js and do not support libraries.


Prerequisites:
1. Have k6 installed locally https://k6.io/docs/get-started/installation/
2. Have yq available locally https://github.com/mikefarah/yq

Debugging:
1. Check logs of k6 operator
2. Describe all jobs in the k6 operator namespace and check the one matching name of your test, can be mounting issues