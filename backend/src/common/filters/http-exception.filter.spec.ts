import { ArgumentsHost, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

function createHost(): { host: ArgumentsHost; json: jest.Mock; status: jest.Mock } {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const request = { method: 'GET', url: '/api/v1/test' };
  const response = { status };
  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;
  return { host, json, status };
}

describe('HttpExceptionFilter', () => {
  it('never leaks a raw internal error message to the client for unexpected errors', () => {
    const filter = new HttpExceptionFilter();
    const { host, json, status } = createHost();

    const internalError = new Error('connect ECONNREFUSED 10.0.0.5:3306 password=supersecret');
    filter.catch(internalError, host);

    expect(status).toHaveBeenCalledWith(500);
    const body = json.mock.calls[0][0];
    expect(body.message).toBe('Internal server error');
    expect(JSON.stringify(body)).not.toContain('supersecret');
    expect(JSON.stringify(body)).not.toContain('ECONNREFUSED');
  });

  it('still surfaces the intended message for a known HttpException', () => {
    const filter = new HttpExceptionFilter();
    const { host, json, status } = createHost();

    filter.catch(new BadRequestException('Discount price must be lower than the regular price'), host);

    expect(status).toHaveBeenCalledWith(400);
    expect(json.mock.calls[0][0].message).toBe('Discount price must be lower than the regular price');
  });

  it('derives a correct "error" phrase for a bare UnauthorizedException with no custom response object', () => {
    const filter = new HttpExceptionFilter();
    const { host, json, status } = createHost();

    filter.catch(new UnauthorizedException(), host);

    expect(status).toHaveBeenCalledWith(401);
    const body = json.mock.calls[0][0];
    expect(body.error).toBe('Unauthorized');
    expect(body.error).not.toBe('Internal Server Error');
  });
});
