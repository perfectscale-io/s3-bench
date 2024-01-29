# Define the default test target
.DEFAULT_GOAL := help

# Define phony targets
.PHONY: deploy help show-tests run destroy .show-tests

list_subdirectories = $(wildcard tests/*)
default_namespace := "k6-operator"
default_test_obj_name := "run.yaml"

help:
	@echo "Usage: make deploy, make run, make destroy"

.show-tests:
	@echo "Available tests:"
	@for dir in $(call list_subdirectories); do \
		echo "  $$dir" | cut -d'/' -f2; \
	done
	@echo "========"

deploy: .show-tests
	@read -p "Enter test name: " testname; \
	kubectl create configmap "$${testname}" --from-file "./tests/$${testname}/main.js" -n ${default_namespace} --dry-run=client -o yaml \
	 | kubectl apply -f -;

run: .show-tests
	@read -p "Enter test name: " test; \
	export testname=$$test; \
	yq eval '(.metadata.name) |= strenv(testname)' "./tests/$$testname/${default_test_obj_name}" | \
	yq eval '(.metadata.namespace) |= ${default_namespace}' | \
	yq eval '(.spec.script.configMap.name) |= strenv(testname)' | \
	kubectl apply -f - && \
	kubectl create configmap "$${test}" --from-file "./tests/$${test}/main.js" -n ${default_namespace} --dry-run=client -o yaml \
	 | kubectl apply -f -;

destroy: .show-tests
	@read -p "Enter test name: " test; \
	export testname=$$test; \
	kubectl delete K6 $$testname -n ${default_namespace} --ignore-not-found=true && \
	kubectl delete configmap $$testname -n ${default_namespace} --ignore-not-found=true