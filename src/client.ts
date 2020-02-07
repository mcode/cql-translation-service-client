// sample header= "multipart/form-data;boundary=Boundary_1"
// get the part after "boundary=" and before any subsequent ;
const extractMultipartBoundary = /.*;boundary=(Boundary.*);?.*/g;

const extractMultipartFileName = /Content-Disposition: form-data; name="([^"]+)"/;

// eveything between { } including newlines. [^] is like . but matches newline
const extractJSONContent = /(\{[^]*\})/;

const extractCQLInclude = /include .* called (.*)/g;

export interface CqlObject {
  main: string;
  libraries: Library;
}

export interface Library {
  [name: string]: string; // should probably have an object for expected ELM structure.
}

export interface ElmObject {
  main: object;
  libraries: {
    [key: string]: object;
  };
}


export class Client {

  protected url: string;

  constructor(serviceUrl: string){
    this.url = serviceUrl;
  }

  /**
 * Function that requests web_service to convert the cql into elm.
 * @param cql - cql file that is the input to the function.
 * @return The resulting elm translation of the cql file.
 */

  public async convertCQL(cql: CqlObject): Promise<ElmObject> {
    // Connect to web service
    const formdata = new FormData();
    Object.keys(cql.libraries).forEach((key, i) => {
      formdata.append(`${key}`, cql.libraries[key]);
    });
  
    formdata.append('main', cql.main);
    return fetch(this.url, {
      method: 'POST',
      body: formdata
    }).then(elm => {
      const header = elm.headers.get('content-type');
      let boundary = '';
      if (header) {
        // sample header= "multipart/form-data;boundary=Boundary_1"
        const result = extractMultipartBoundary.exec(header);
        boundary = result ? `--${result[1]}` : '';
      }
      const obj: ElmObject = { main: {}, libraries: {} };
      return elm.text().then(text => {
        const elms = text.split(boundary).reduce((oldArray, line, i) => {
          const body = extractJSONContent.exec(line);
          if (body) {
            const elmName = extractMultipartFileName.exec(line);
            if (elmName && elmName[1] === 'main') {
              oldArray[elmName[1]] = JSON.parse(body[1]);
            } else if (elmName) {
              oldArray.libraries[elmName[1]] = JSON.parse(body[1]);
            }
          }
          return oldArray;
        }, obj);
  
        return elms;
      });
    });
  }

  public async convertBasicCQL(cql: string): Promise<object> {
    // Connect to web service
  
    return fetch(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/cql',
        Accept: 'application/elm+json'
      },
      body: cql
    }).then(elm => elm.json());
  }

}

