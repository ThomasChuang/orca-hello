#!/usr/bin/env groovy

// deployment:
// if branch isn't 'master'
//   - run tests
//   - build container image with tag=<branch_name>
//   - push created image to registry
// if branch is 'master' and parameter DEPLOY_PROD=false
//   - run tests
//   - build container image with tag=<semver> (e.g. v1.2.3)
//   - push image to registry
//   - deploy image to development cluster
//   - create new tag=<semver> in git and push it to repo
// if branch is 'master' and parameter DEPLOY_PROD=true
//   - deploy image created previously and tagged with <semver> to prod clusters.
//     by default latest tag will be deployed, but it's possible to select previous tag,
//     see environment RELEASE_VERSION for more details
// also see parameters description for more info on deploy logic.
//
// kubernetes credentials:
// names of jenkins credential must align with naming of
// app environment configuration files (src/conf/) prefixed with 'kubeconfig-'
// example:
//     app environment config name:     'production-sg' (src/conf/production-sg.json)
//     jenkins kubeconfig secret name:  'kubeconfig-production-sg'
// jenkins credentials should contain string with base64 encoded kubeconfig.

pipeline {
	agent {
		node { label 'container-host' }
	}

	options {
		timeout(time: 1, unit: 'HOURS')
		retry(0)
		quietPeriod(0)
		buildDiscarder(logRotator(numToKeepStr: '30', daysToKeepStr: '90'))
		timestamps()
		ansiColor('xterm')
	}

	parameters {
		booleanParam(
			name: 'DEPLOY_PROD',
			defaultValue: false,
			description: 'set to true to deploy app to production environments')

		string(
			name: 'PROD_ENVIRONMENTS',
			defaultValue: 'production-sg production-my production-id production-ph production-th production-tw production-au',
			description: '''
				space separated list of production environments.
				this parameter only affects deployment, when DEPLOY_PROD=true.
			''')

		string(
			name: 'RELEASE_VERSION',
			defaultValue: '',
			description: '''
				this parameter affects only master branch builds
				if DEPLOY_PROD=false and BRANCH!='master'          - use the branch name as tag
				if DEPLOY_PROD=false and RELEASE_VERSION=''        - create new tag by incrementing minor version of previous tag
				if DEPLOY_PROD=false and RELEASE_VERSION='v1.2.3'  - create new tag 'v1.2.3'

				if DEPLOY_PROD=true and RELEASE_VERSION=''         - use latest tag to deploy to prod environments
				if DEPLOY_PROD=true and RELEASE_VERSION='v1.2.3'   - deploy 'v1.2.3' to prod environments (image for v1.2.3 must exist)
			''')

		string(
			name: 'HELM_ARGS',
			defaultValue: '',
			description: 'additional arguments passed to "helm template" command')

		string(
			name: 'GITHUB_CREDENTIALS',
			defaultValue: 'shopback-ci-ssh-key',
			description: 'name of jenkins credentials (ssh key) used to pull submodule and push release tag to app github repo')

		string(
			name: 'JENKINS_AWS_KEYS',
			defaultValue: 'jenkins-aws-keys',
			description: 'name of jenkins credentials which contains AWS access/secret keys (required for kubectl iam-authenticator)')

		choice(
			name: 'TARGET_NAMESPACE',
			choices:['development','qa'],
			description: '''
			   This parameter required when deploy to non-production environment.
				 if DEPLOY_PROD=true  - Only deploy the image to production cluster by PROD_ENVIRONMENTS
				 if DEPLOY_PROD=false - The selected value will be used to deploy to the specified k8s namespace.
			'''
		)
	}

	environment {
		// container image name stucture: orgname/appname:tag
		REGISTRY_ORG = 'shopbackcom'
		APP_NAME = 'orca-hello'
	}

	stages {
		stage("Prepare workspace") {
			steps {
				// update submodule and fetch tags
				sshagent (credentials: [params.GITHUB_CREDENTIALS]) {
					sh('''#!/bin/bash -e
						git submodule update --init
						git submodule status
						git fetch --tags
					''')
				}

				// save release version in file to reuse it in further steps
				// it holds semver value used to tag releases and images in master branch, e.g. v1.2.3
				sh('''#!/bin/bash -e
					LATEST_TAG=$(git tag --sort="v:refname" | awk '/^v[0-9].*$/ {v=$1} END {print v}')

					# determine release version if input parameter is empty, otherwise use from input
					if [[ "$DEPLOY_PROD" == "true" && -z "$RELEASE_VERSION" ]]; then
						RELEASE_VERSION="$LATEST_TAG"
					elif [[ "$DEPLOY_PROD" != "true" && -z "$RELEASE_VERSION" ]]; then
						
						if [[ "$GIT_BRANCH" != "master" ]]; then
							#When branch is not master and want to deploy to development/qa namespace
							RELEASE_VERSION="${GIT_BRANCH}"
						elif [[ -z "$LATEST_TAG" ]]; then
							# no previous tags, create initial
							RELEASE_VERSION="v0.0.1"
						else
							# increment latest existing tag
							RELEASE_VERSION=$(echo "$LATEST_TAG" | awk -F '.' '{printf("%s.%s.%s", $1, $2, $3 + 1)}')
						fi
					fi

					echo "$RELEASE_VERSION" > RELEASE_VERSION
					echo 
				''')

				// print build parameters
				sh('''#!/bin/bash
					echo "
					GIT_URL:             $GIT_URL
					GIT_BRANCH:          $GIT_BRANCH
					GIT_COMMIT:          $GIT_COMMIT
					APP_NAME:            $APP_NAME
					REGISTRY_ORG:        $REGISTRY_ORG
					RELEASE_VERSION:     $(cat RELEASE_VERSION)
					DEPLOY_PROD:         $DEPLOY_PROD
					PROD_ENVIRONMENTS:   $PROD_ENVIRONMENTS
					GITHUB_CREDENTIALS:  $GITHUB_CREDENTIALS
					JENKINS_AWS_KEYS:    $JENKINS_AWS_KEYS
					DEPLOY_NAMESPACE:    $DEPLOY_NAMESPACE"
				''')
			}
		}

	}

	post {
		success {
			cleanWs()
		}
	}
}
