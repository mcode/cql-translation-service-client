import axios from "axios";
import * as FormData from 'form-data';
import { CqlLibraries, ElmLibraries, ElmLibrary} from "./types";

// sample header= "multipart/form-data;boundary=Boundary_1"
// get the part after "boundary=" and before any subsequent ;
const extractMultipartBoundary = /.*;boundary=(Boundary.*);?.*/;

const extractMultipartFileName = /Content-Disposition: form-data; name="([^"]+)"/;

// eveything between { } including newlines. [^] is like . but matches newline
const extractJSONContent = /(\{[^]*\})/;

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

    return axios
      .post(this.url, formdata, {headers:  formdata.getHeaders()})
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
