import http from 'k6/http';
import exec from 'k6/execution';
import { sleep } from 'k6';

import { randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import { AWSConfig, S3Client } from 'https://jslib.k6.io/aws/0.10.0/s3.js';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

const AWS_REGION = __ENV.AWS_REGION;
const AWS_ROLE_ARN = __ENV.AWS_ROLE_ARN;
const AWS_WEB_IDENTITY_TOKEN = open('/var/run/secrets/eks.amazonaws.com/serviceaccount/token', 'utf-8');

const S3_BUCKET_NAME = 'perfectscale-load-test';
const OBJECT = randomString(16);

const teardown_sleep = 5 * 60;

export const options = {
  // proto,subproto,status,method,url,
  // name,group,check,error,error_code,tls_version,scenario,service,expected_response
  systemTags: ['status', 'method'],
  teardownTimeout: `${teardown_sleep}s`,
  scenarios: {
    s3: {
      executor: 'constant-arrival-rate',

      // How long the test lasts
      duration: '5h',

      // How many iterations per timeUnit
      rate: 10000,

      // Start `rate` iterations per second
      timeUnit: '1s',

      // Pre-allocate VUs
      preAllocatedVUs: 400,
      maxVUs: 10000
    }
  },
};

export function setup() {
  const url = "https://sts.amazonaws.com";
  const assumeRoleWithWebIdentityURL = `${url}/?Action=AssumeRoleWithWebIdentity&RoleArn=${AWS_ROLE_ARN}&WebIdentityToken=${AWS_WEB_IDENTITY_TOKEN}&RoleSessionName=app2&Version=2011-06-15&DurationSeconds=3600`;

  const params = {
    headers: {
      Accept: "application/json"
    },
  };

  let res_raw = http.post(assumeRoleWithWebIdentityURL, null, params);
  let res = res_raw.json();

  let credentials = res.AssumeRoleWithWebIdentityResponse.AssumeRoleWithWebIdentityResult.Credentials
  const awsConfig = new AWSConfig({
    region: AWS_REGION,
    accessKeyId: credentials.AccessKeyId,
    secretAccessKey: credentials.SecretAccessKey,
    sessionToken: credentials.SessionToken,
  });

  // const COMMON_PREFIX = uuidv4();
  // const TENANTS = [uuidv4(), uuidv4()]
  const COMMON_PREFIX = "c467384c-368c-4cb1-90d9-221a979de7a6";
  const TENANTS = ["7bd96f24-4b50-435b-842b-e104783ae302", "d1ff3621-8740-47bf-9fb5-aa55b7c1d305"];

  return { awsConfig: awsConfig, COMMON_PREFIX: COMMON_PREFIX, TENANTS: TENANTS };
}

let s3client = null;
let tenant_id = null;
let common_prefix = null;

export default async function(data) {
  if (s3client === null) {
    // since I cannot init it in setup for some reason
    s3client = new S3Client(data.awsConfig);
    tenant_id = data.TENANTS[exec.vu.idInTest%data.TENANTS.length];
    common_prefix = data.COMMON_PREFIX
    console.log(`using commong prefix ${common_prefix}`)
    console.log(`using tenant id: ${tenant_id}`)
  }
  // every iteration it will generate new key and put same data
  const object_name = uuidv4();
  const obj_key = `${common_prefix}/${tenant_id}/${object_name}`
  // const obj_key = `${tenant_id}/${object_name}`
  exec.vu.metrics.tags["name"] =  `${common_prefix}/${tenant_id}`;
  // exec.vu.metrics.tags["name"] =  `${tenant_id}`;
  let putRequest =  s3client.putObject(S3_BUCKET_NAME, obj_key, OBJECT);
  delete exec.vu.metrics.tags["url"];
  delete exec.vu.metrics.tags["name"];
  try {
    await putRequest;
  } catch (error) {
    // ignoring, we still get it in the metrics
  }
}

export function teardown() {
  // sleep to collect logs from the pod
  sleep(teardown_sleep);
}
