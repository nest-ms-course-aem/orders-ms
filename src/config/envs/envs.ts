import { validate } from 'class-validator'
import 'dotenv/config'
import * as joi from 'joi'

//Defines the interface of the envs

interface IEnvVars { 
    PORT: number;
    PRODUCT_PORT: number;
    PRODUCT_HOST: string;
}

// Schema validation
const envsSchema = joi.object({
    PORT: joi.number().required(),
    PRODUCT_PORT: joi.number().required(),
    PRODUCT_HOST: joi.string().required(),
})
.unknown(true);

// Error and value
const {error, value} = envsSchema.validate(process.env);

if(error){
    throw new Error(`Env config validation error ${error?.message}`);
}

//Type value and return the env vars validated by Joi
const envVars: IEnvVars = value;

export const envs = {
    port: envVars?.PORT,
    productPort: envVars?.PRODUCT_PORT,
    productHost: envVars?.PRODUCT_HOST,
}
