import axios from "axios";
import * as FormData from 'form-data';

// sample header= "multipart/form-data;boundary=Boundary_1"
// get the part after "boundary=" and before any subsequent ;
const extractMultipartBoundary = /.*;boundary=(Boundary.*);?.*/;

const extractMultipartFileName = /Content-Disposition: form-data; name="([^"]+)"/;

// eveything between { } including newlines. [^] is like . but matches newline
const extractJSONContent = /(\{[^]*\})/;

const extractCQLInclude = /include .* called (.*)/g;

export interface CqlLibraries {
  [name: string]: {
    cql: string;
    version?: string;
  };
}

export interface ElmLibraries {
  [key: string]: ElmLibrary;
}

export interface ElmLibrary {
  library: {
    identifier: {
      id: string;
      version: string;
    };
    schemaIdentifier: {
      id: string;
      version: string;
    };
    usings?: {
      def: ElmUsing[];
    };
    includes?: {
      def: ElmIncludes[];
    };
    valueSets?: {
      def: ElmValueSet[];
    };
    codes?: {
      def: ElmCode[];
    };
    codeSystems?: {
      def: ElmCodeSystem[];
    };
    concepts?: {
      def: object[];
    };
    statements: {
      def: ElmStatement[];
    };
    [x: string]: object | undefined;
  };
}

export interface ElmUsing {
  uri: string;
  localIdentifier: string;
  localId?: string;
  locator?: string;
  version?: string;
}

export interface ElmIncludes {
  path: string;
  version: string;
  localId?: string;
  locator?: string;
  localIdentifier?: string;
}

export interface ElmValueSet {
  id: string;
  name: string;
  localId?: string;
  locator?: string;
  accessLevel: string;
  resultTypeSpecifier: object;
}

export interface ElmCode {
  id: string;
  name: string;
  display: string;
  codeSystem: {
    name: string;
  };
  accessLevel: string;
}

export interface ElmCodeSystem {
  id: string;
  name: string;
  accessLevel: string;
}

export interface ElmStatement {
  name: string;
  context: string;
  expression: object;
  locator?: string;
  locatorId?: string;
  accessLevel?: string;
  resultTypeName?: string;
  annotation?: object[];
}

export class Client {
  protected url: string;
  protected headers: object;

  constructor(serviceUrl: string) {
    this.url = serviceUrl;
    this.headers = {
      "Content-Type": "application/cql",
      Accept: "application/elm+json"
    };
  }

  /**
   * Function that requests web_service to convert the cql into elm.
   * @param cqlLibraries - object containing CqlLibraries that is the input to the function.
   * @return The resulting elm translation of the cql libraries.
   */
  public async convertCQL(cqlLibraries: CqlLibraries): Promise<ElmLibraries> {
    // Connect to web service
    const formdata = new FormData();
    Object.keys(cqlLibraries).forEach((key) => {
      const cqlLibrary = cqlLibraries[key];
      if (cqlLibrary.cql) {
        formdata.append(`${key}`, cqlLibrary.cql);
      }
    });

    // Use formdata.getHeaders() in node environment, formdata.getHeaders does not work in browser
    let headers;
    if (formdata.getHeaders) headers = formdata.getHeaders();

    return axios
      .post(this.url, formdata, { headers })
      .then(elm => this.handleElm(elm))
      .catch(error => {
        if (error.response?.status === 400 && error.response?.data.library)
          return this.handleElm(error.response.data);
        else return error;
      });
  }

  public async convertBasicCQL(cql: string): Promise<ElmLibrary> {
    // Connect to web service
    return axios
      .post(this.url, cql, {
        headers: this.headers
      })
      .then(response => {
        return response.data;
      })
      .catch(error => {
        if (error.response?.status === 400 && error.response?.data.library)
          return error.response.data;
        else return error;
      });
  }

  private handleElm(elm: any): ElmLibrary {
    const header = elm.headers['content-type'];
    let boundary = '';
    if (header) {
      // sample header= "multipart/form-data;boundary=Boundary_1"
      const result = extractMultipartBoundary.exec(header);
      boundary = result ? `--${result[1]}` : '';
    }

    const elmLibraries: ElmLibraries = {};
    return elm.data.split(boundary).reduce((oldArray: any, line: any) => {
      const body = extractJSONContent.exec(line);
      if (body) {
        const elmName = extractMultipartFileName.exec(line);
        if (elmName) oldArray[elmName[1]] = JSON.parse(body[1]);
      }
      return oldArray;
    }, elmLibraries);
  }
}
